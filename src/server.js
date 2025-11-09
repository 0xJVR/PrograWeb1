// Servidor principal con Express y Socket.IO
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload');

const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const Message = require('./models/Message');
const User = require('./models/User');

// Inicializar Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.IO con CORS
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Conectar a MongoDB
mongoose.connect(config.mongodbUri)
.then(() => {
  console.log('Conectado a MongoDB');
})
.catch((error) => {
  console.error('Error al conectar a MongoDB:', error);
  process.exit(1);
});

// Middleware de autenticación para Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Token de autenticación requerido'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.user = decoded;
    next();
  } catch (error) {
    return next(new Error('Token inválido'));
  }
});

// Función para generar ID de conversación
function generateConversationId(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

// Obtener sockets de administradores conectados
function getAdminSockets() {
  const sockets = Array.from(io.sockets.sockets.values());
  return sockets.filter(socket => socket.user && socket.user.role === 'admin');
}

// Obtener sockets de usuarios conectados
function getUserSockets() {
  const sockets = Array.from(io.sockets.sockets.values());
  return sockets.filter(socket => socket.user && socket.user.role === 'user');
}

// Mapa para rastrear qué admin está asignado a cada usuario
const userAdminAssignments = new Map();

// Mapa para rastrear usuarios que están escribiendo
const typingUsers = new Map();

// Eventos de Socket.IO
io.on('connection', async (socket) => {
  try {
    // Cargar datos completos del usuario para incluir profileColor
    const dbUser = await User.findById(socket.user.id).select('email role profileColor');
    const userEmail = dbUser?.email || socket.user.email;
    const userRole = dbUser?.role || socket.user.role;
    const profileColor = dbUser?.profileColor ?? 0;

    console.log(`Usuario conectado: ${userEmail} (${socket.id}) - Rol: ${userRole}`);

    // Enviar información del usuario al conectarse (incluye profileColor)
    socket.emit('user info', {
      id: socket.user.id,
      email: userEmail,
      role: userRole,
      profileColor
    });

    // Si es administrador, enviar lista de conversaciones
    if (userRole === 'admin') {
      loadAdminConversations(socket);
    } else {
      // Si es usuario, asignar un administrador aleatorio
      assignRandomAdmin(socket);
    }

    // Notificar a todos que un usuario se conectó
    socket.broadcast.emit('user connected', {
      userName: userEmail.split('@')[0],
      role: userRole,
      timestamp: new Date()
    });

    // Recibir y distribuir mensajes de chat
    socket.on('chat message', async (data) => {
      try {
        const { content, recipientId, conversationId } = data;
        let targetConversationId = conversationId;

        // Determinar el destinatario y la conversación
        if (userRole === 'user') {
          // Usuario envía mensaje a su administrador asignado
          const assignedAdminId = userAdminAssignments.get(socket.user.id);
          if (!assignedAdminId) {
            // Si no tiene admin asignado, asignar uno ahora
            const adminSockets = getAdminSockets();
            if (adminSockets.length === 0) {
              socket.emit('no admin available');
              return;
            }
            const randomAdmin = adminSockets[Math.floor(Math.random() * adminSockets.length)];
            userAdminAssignments.set(socket.user.id, randomAdmin.user.id);
            targetConversationId = generateConversationId(socket.user.id, randomAdmin.user.id);
            
            // Notificar al usuario sobre la asignación
            socket.emit('admin assigned', {
              adminId: randomAdmin.user.id,
              adminName: randomAdmin.user.email.split('@')[0],
              conversationId: targetConversationId
            });
            
            // Notificar al administrador sobre el nuevo usuario
            randomAdmin.emit('new user assigned', {
              userId: socket.user.id,
              userName: userEmail.split('@')[0],
              conversationId: targetConversationId
            });
          } else {
            targetConversationId = generateConversationId(socket.user.id, assignedAdminId);
          }
        } else if (userRole === 'admin' && recipientId) {
          // Administrador envía mensaje a un usuario específico
          targetConversationId = generateConversationId(socket.user.id, recipientId);
        }

        // Guardar mensaje en la base de datos
        const message = new Message({
          sender: new mongoose.Types.ObjectId(socket.user.id),
          senderName: userEmail.split('@')[0],
          recipient: userRole === 'user' ? new mongoose.Types.ObjectId(userAdminAssignments.get(socket.user.id)) : new mongoose.Types.ObjectId(recipientId),
          content,
          conversationType: 'direct',
          conversationId: targetConversationId
        });

        await message.save();

        // Enviar mensaje a los participantes de la conversación
        const recipientSocket = findSocketByUserId(userRole === 'user' ? userAdminAssignments.get(socket.user.id) : recipientId);
        
        if (recipientSocket) {
          recipientSocket.emit('chat message', {
            id: message._id,
            senderId: socket.user.id,
            senderName: message.senderName,
            content: message.content,
            timestamp: message.timestamp,
            conversationId: targetConversationId
          });
          
          // Si el destinatario es un administrador, actualizar su lista de conversaciones
          if (recipientSocket.user.role === 'admin') {
            loadAdminConversations(recipientSocket);
          }
        }

        // También enviar al remitente para confirmación
        socket.emit('chat message', {
          id: message._id,
          senderId: socket.user.id,
          senderName: message.senderName,
          content: message.content,
          timestamp: message.timestamp,
          conversationId: targetConversationId
        });

        // Si es admin, actualizar la lista de conversaciones
        if (userRole === 'admin') {
          loadAdminConversations(socket);
        }

      } catch (error) {
        console.error('Error al procesar mensaje:', error);
        socket.emit('error', { message: 'Error al enviar mensaje' });
      }
    });

    // Usuario está escribiendo
    socket.on('user typing', (data) => {
      const { isTyping, conversationId } = data;
      
      if (isTyping) {
        typingUsers.set(socket.user.id, { conversationId, timestamp: Date.now() });
      } else {
        typingUsers.delete(socket.user.id);
      }

      // Notificar al otro participante de la conversación
      let targetUserId;
      if (userRole === 'user') {
        targetUserId = userAdminAssignments.get(socket.user.id);
      } else if (conversationId) {
        const participants = conversationId.split('_');
        targetUserId = participants.find(id => id !== socket.user.id);
      }

      if (targetUserId) {
        const targetSocket = findSocketByUserId(targetUserId);
        if (targetSocket) {
          targetSocket.emit('user typing', {
            userId: socket.user.id,
            userName: userEmail.split('@')[0],
            isTyping,
            conversationId
          });
        }
      }
    });

    // Cargar historial de mensajes
    socket.on('load messages', async (data) => {
      try {
        const { conversationId } = data;
        const messages = await Message.find({ conversationId })
          .sort({ timestamp: 1 })
          .limit(50);

        socket.emit('messages loaded', {
          conversationId,
          messages: messages.map(msg => ({
            id: msg._id,
            senderId: msg.sender.toString(),
            senderName: msg.senderName,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        });
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
        socket.emit('error', { message: 'Error al cargar mensajes' });
      }
    });

    // Cargar conversaciones (para administradores)
    socket.on('load conversations', async () => {
      if (userRole === 'admin') {
        await loadAdminConversations(socket);
      }
    });

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${userEmail} (${socket.id})`);
      
      // Limpiar asignaciones si era un administrador
      if (userRole === 'admin') {
        for (const [userId, adminId] of userAdminAssignments.entries()) {
          if (adminId === socket.user.id) {
            userAdminAssignments.delete(userId);
            // Reasignar usuarios a otro admin
            const userSocket = findSocketByUserId(userId);
            if (userSocket) {
              assignRandomAdmin(userSocket);
            }
          }
        }
      } else {
        // Si era usuario, limpiar su asignación
        userAdminAssignments.delete(socket.user.id);
      }

      // Limpiar estado de escritura
      typingUsers.delete(socket.user.id);

      socket.broadcast.emit('user disconnected', {
        userName: userEmail.split('@')[0],
        role: userRole,
        timestamp: new Date()
      });
    });
  } catch (e) {
    console.error('Error en conexión de socket:', e);
    socket.emit('error', { message: 'Error de conexión' });
  }
});

// Función para asignar un administrador aleatorio a un usuario
function assignRandomAdmin(userSocket) {
  const adminSockets = getAdminSockets();
  if (adminSockets.length === 0) {
    userSocket.emit('no admin available');
    return;
  }

  const randomAdmin = adminSockets[Math.floor(Math.random() * adminSockets.length)];
  userAdminAssignments.set(userSocket.user.id, randomAdmin.user.id);
  
  userSocket.emit('admin assigned', {
    adminId: randomAdmin.user.id,
    adminName: randomAdmin.user.email.split('@')[0],
    conversationId: generateConversationId(userSocket.user.id, randomAdmin.user.id)
  });

  // Notificar al administrador sobre el nuevo usuario
  randomAdmin.emit('new user assigned', {
    userId: userSocket.user.id,
    userName: userSocket.user.email.split('@')[0],
    conversationId: generateConversationId(userSocket.user.id, randomAdmin.user.id)
  });
  
  // Actualizar la lista de conversaciones del administrador
  loadAdminConversations(randomAdmin);
}

// Función para cargar conversaciones del administrador
async function loadAdminConversations(adminSocket) {
  try {
    // Convertir el ID del admin a ObjectId para la consulta
    const adminObjectId = new mongoose.Types.ObjectId(adminSocket.user.id);
    
    // Obtener todas las conversaciones únicas donde el admin participa
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: adminObjectId },
            { recipient: adminObjectId }
          ]
        }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ['$recipient', adminObjectId] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    // Obtener información de los usuarios en cada conversación
    const conversationsWithUsers = await Promise.all(
      conversations.map(async (conv) => {
        const participants = conv._id.split('_');
        const otherUserId = participants.find(id => id !== adminSocket.user.id);
        const otherUser = await User.findById(otherUserId);
        
        return {
          conversationId: conv._id,
          userId: otherUserId,
          userName: otherUser ? otherUser.email.split('@')[0] : 'Usuario',
          lastMessage: conv.lastMessage.content,
          lastMessageTime: conv.lastMessage.timestamp,
          unreadCount: conv.unreadCount
        };
      })
    );

    adminSocket.emit('conversations loaded', conversationsWithUsers);
  } catch (error) {
    console.error('Error al cargar conversaciones:', error);
  }
}

// Función para encontrar socket por ID de usuario
function findSocketByUserId(userId) {
  const sockets = Array.from(io.sockets.sockets.values());
  return sockets.find(socket => socket.user && socket.user.id === userId);
}

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
server.listen(config.port, () => {
  console.log(`Servidor corriendo en http://localhost:${config.port}`);
  console.log(`JWT Secret configurado: ${config.jwtSecret.substring(0, 10)}...`);
  console.log(`Modo: ${config.nodeEnv}`);
});

module.exports = { app, server, io };
