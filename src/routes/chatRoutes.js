// Rutas del chat (endpoints HTTP para historial)
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authenticateJWT } = require('../middleware/authenticateJWT');

/**
 * GET /api/chat/messages
 * Obtener historial de mensajes (últimos 50)
 */
router.get('/messages', authenticateJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('user', 'name email');

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
