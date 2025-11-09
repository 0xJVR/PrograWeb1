// Rutas de administración
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Message = require('../models/Message');
const { authenticateJWT } = require('../middleware/authenticateJWT');

// Middleware para verificar que sea admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador'
    });
  }
  next();
};

/**
 * GET /api/admin/stats
 * Obtener estadísticas del sistema
 */
router.get('/stats', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalProducts = await Product.countDocuments();
    const totalMessages = await Message.countDocuments();

    // Usuarios creados en los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Mensajes en los últimos 7 días
    const recentMessages = await Message.countDocuments({ timestamp: { $gte: sevenDaysAgo } });

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          admins: totalAdmins,
          regularUsers: totalUsers - totalAdmins,
          newThisWeek: recentUsers
        },
        products: {
          total: totalProducts
        },
        messages: {
          total: totalMessages,
          thisWeek: recentMessages
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/users
 * Obtener lista de usuarios
 */
router.get('/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const skip = (page - 1) * limit;

    // Construir filtro
    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter.role = role;
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
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
 * PUT /api/admin/users/:id
 * Actualizar usuario
 */
router.put('/users/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { name, role } = req.body;
    const userId = req.params.id;

    // No permitir que el admin se quite a sí mismo el rol de admin
    if (userId === req.user.id && role === 'user') {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol de admin'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (name) user.name = name;
    if (role && ['user', 'admin'].includes(role)) user.role = role;

    await user.save();

    res.json({
      success: true,
      message: 'Usuario actualizado',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Eliminar usuario
 */
router.delete('/users/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // No permitir que el admin se elimine a sí mismo
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta desde el panel de admin'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Usuario eliminado'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/products
 * Obtener lista de productos con filtros
 */
router.get('/products', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments();
    const products = await Product.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      products
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/activity
 * Obtener registro de actividad reciente
 */
router.get('/activity', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentProducts = await Product.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentMessages = await Message.find()
      .select('senderName content timestamp')
      .sort({ timestamp: -1 })
      .limit(5);

    res.json({
      success: true,
      activity: {
        recentUsers,
        recentProducts,
        recentMessages
      }
    });
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener actividad',
      error: error.message
    });
  }
});

module.exports = router;
