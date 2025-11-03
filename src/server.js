// Servidor principal con Express y Socket.IO
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const Message = require('./models/Message');

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

// Eventos de Socket.IO
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.user.email} (${socket.id})`);

  // Enviar información del usuario al conectarse
  socket.emit('user info', {
    id: socket.user.id,
    email: socket.user.email,
    role: socket.user.role
  });

  // Notificar a todos que un usuario se conectó
  socket.broadcast.emit('user connected', {
    userName: socket.user.email.split('@')[0],
    timestamp: new Date()
  });

  // Recibir y distribuir mensajes de chat
  socket.on('chat message', async (data) => {
    try {
      const { content } = data;

      // Guardar mensaje en la base de datos
      const message = new Message({
        user: socket.user.id,
        userName: socket.user.email.split('@')[0],
        content
      });

      await message.save();

      // Enviar mensaje a todos los clientes conectados
      io.emit('chat message', {
        id: message._id,
        userName: message.userName,
        content: message.content,
        timestamp: message.timestamp
      });

    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  });

  // Usuario está escribiendo
  socket.on('user typing', (data) => {
    socket.broadcast.emit('user typing', {
      userName: socket.user.email.split('@')[0],
      isTyping: data.isTyping
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.user.email} (${socket.id})`);
    socket.broadcast.emit('user disconnected', {
      userName: socket.user.email.split('@')[0],
      timestamp: new Date()
    });
  });
});

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

