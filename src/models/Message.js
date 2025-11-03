// Modelo de Mensaje para persistencia del chat
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
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
  }
});

// Índice para búsquedas rápidas por fecha
messageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
