// Rutas del chat (endpoints HTTP para historial)
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateJWT } = require('../middleware/authenticateJWT');

/**
 * GET /api/chat/conversations
 * Obtener lista de conversaciones para el usuario actual
 */
router.get('/conversations', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    if (userRole === 'user') {
      // Usuarios ven su conversación más reciente (si existe)
      const userMessages = await Message.find({ 
        $or: [
          { sender: userObjectId },
          { recipient: userObjectId }
        ],
        conversationType: 'direct'
      }).sort({ timestamp: -1 });
      
      let conversations = [];
      if (userMessages.length > 0) {
        // Agrupar por conversationId para obtener conversaciones únicas
        const conversationIds = [...new Set(userMessages.map(msg => msg.conversationId))];
        
        // Obtener el último mensaje de cada conversación
        for (const convId of conversationIds) {
          const lastMessage = await Message.findOne({ conversationId: convId })
            .sort({ timestamp: -1 });
            
          if (lastMessage) {
            // Encontrar el otro participante
            const otherParticipantId = lastMessage.sender.toString() === userId 
              ? lastMessage.recipient.toString() 
              : lastMessage.sender.toString();
              
            const otherParticipant = await User.findById(otherParticipantId);
            
            if (otherParticipant) {
              conversations.push({
                conversationId: convId,
                lastMessage: lastMessage.content,
                lastMessageTime: lastMessage.timestamp,
                participants: [{
                  id: otherParticipant._id,
                  name: otherParticipant.name || otherParticipant.email.split('@')[0],
                  email: otherParticipant.email,
                  role: otherParticipant.role
                }]
              });
            }
          }
        }
        
        // Ordenar por timestamp del último mensaje
        conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        
        // Limitar a una sola conversación para usuarios (la más reciente)
        if (conversations.length > 0) {
          conversations = [conversations[0]];
        }
      }
      
      return res.json({
        success: true,
        conversations
      });
    }
    
    // Administradores ven todas las conversaciones directas
    const adminConversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ],
          conversationType: 'direct'
        }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$$ROOT' },
          participantIds: {
            $addToSet: {
              $cond: [
                { $eq: ['$sender', userObjectId] },
                '$recipient',
                '$sender'
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participantIds',
          foreignField: '_id',
          as: 'participants'
        }
      },
      {
        $project: {
          conversationId: '$_id',
          lastMessage: '$lastMessage.content',
          lastMessageTime: '$lastMessage.timestamp',
          participants: {
            $map: {
              input: '$participants',
              as: 'participant',
              in: {
                id: '$$participant._id',
                name: '$$participant.name',
                email: '$$participant.email',
                role: '$$participant.role'
              }
            }
          }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    res.json({
      success: true,
      conversations: adminConversations
    });
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conversaciones',
      error: error.message
    });
  }
});

/**
 * GET /api/chat/messages/:conversationId
 * Obtener mensajes de una conversación específica
 */
router.get('/messages/:conversationId', authenticateJWT, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const limit = parseInt(req.query.limit) || 50;

    // Verificar que el usuario tiene acceso a esta conversación
    const sampleMessage = await Message.findOne({ 
      conversationId,
      $or: [{ sender: userObjectId }, { recipient: userObjectId }]
    });

    if (!sampleMessage) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a esta conversación'
      });
    }

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('sender', 'name email')
      .populate('recipient', 'name email');

    // Invertir para mostrar en orden cronológico
    messages.reverse();

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes',
      error: error.message
    });
  }
});

/**
 * POST /api/chat/start-conversation
 * Iniciar una nueva conversación con un usuario específico
 */
router.post('/start-conversation', authenticateJWT, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    // Validar que el destinatario existe
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Usuario destinatario no encontrado'
      });
    }

    // Validar roles
    if (senderRole === 'user' && recipient.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes iniciar conversaciones con administradores'
      });
    }

    // Administradores pueden chatear con cualquier usuario o admin

    // Generar ID de conversación único (ordenado por IDs de usuarios)
    const sortedIds = [senderId, recipientId].sort();
    const conversationId = `${sortedIds[0]}_${sortedIds[1]}`;

    // Verificar si ya existe la conversación
    const existingMessage = await Message.findOne({ conversationId });
    if (existingMessage) {
      return res.json({
        success: true,
        conversationId,
        message: 'Conversación ya existe'
      });
    }

    // Crear primer mensaje de sistema o dejar vacío
    res.json({
      success: true,
      conversationId
    });
  } catch (error) {
    console.error('Error al iniciar conversación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar conversación',
      error: error.message
    });
  }
});

/**
 * DELETE /api/chat/messages
 * Limpiar historial de chat (solo admin)
 */
router.delete('/messages', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden limpiar el historial'
      });
    }

    await Message.deleteMany({});
    res.json({
      success: true,
      message: 'Historial de chat limpiado exitosamente'
    });
  } catch (error) {
    console.error('Error al limpiar mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar mensajes',
      error: error.message
    });
  }
});

module.exports = router;
