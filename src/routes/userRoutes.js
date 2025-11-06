// Rutas de configuración de usuario
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateJWT } = require('../middleware/authenticateJWT');
const bcrypt = require('bcryptjs');

// Gradientes disponibles
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)'
];

/**
 * GET /api/users
 * Obtener lista de usuarios (solo para administradores)
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden ver la lista de usuarios'
      });
    }

    const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
});

/**
 * GET /api/users/profile
 * Obtener perfil del usuario actual
 */
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileColor: user.profileColor,
        bio: user.bio,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
});

/**
 * PUT /api/users/profile
 * Actualizar información del perfil
 */
router.put('/profile', authenticateJWT, async (req, res) => {
  try {
    const { name, bio, profileImage } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar campos
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profileImage) user.profileImage = profileImage;
    
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileColor: user.profileColor,
        bio: user.bio,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
});

/**
 * PUT /api/users/profile-color
 * Cambiar color de perfil
 */
router.put('/profile-color', authenticateJWT, async (req, res) => {
  try {
    const { colorIndex } = req.body;

    // Validar que el índice esté en rango
    if (colorIndex === undefined || colorIndex < 0 || colorIndex > 7) {
      return res.status(400).json({
        success: false,
        message: 'Índice de color inválido. Debe estar entre 0 y 7'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.profileColor = colorIndex;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Color de perfil actualizado',
      profileColor: user.profileColor,
      gradient: GRADIENTS[colorIndex]
    });
  } catch (error) {
    console.error('Error al cambiar color:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar color',
      error: error.message
    });
  }
});

/**
 * POST /api/users/change-password
 * Cambiar contraseña
 */
router.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validar campos
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Cambiar contraseña
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/account
 * Eliminar cuenta de usuario
 */
router.delete('/account', authenticateJWT, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña es requerida para eliminar la cuenta'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Eliminar usuario
    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: 'Cuenta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar cuenta',
      error: error.message
    });
  }
});

/**
 * GET /api/users/gradients
 * Obtener lista de gradientes disponibles
 */
router.get('/gradients', (req, res) => {
  res.json({
    success: true,
    gradients: GRADIENTS.map((gradient, index) => ({
      id: index,
      gradient
    }))
  });
});

module.exports = router;