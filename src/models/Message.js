// Modelo de Mensaje para persistencia del chat
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'El contenido del mensaje es requerido'],
    trim: true,
    maxlength: [1000, 'El mensaje no puede exceder 1000 caracteres']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  conversationType: {
    type: String,
    enum: ['direct', 'admin_broadcast'],
    required: true,
    default: 'direct'
  },
  conversationId: {
    type: String,
    required: true
  }
});

// Índices para búsquedas rápidas
messageSchema.index({ timestamp: -1 });
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ conversationType: 1 });

module.exports = mongoose.model('Message', messageSchema);
