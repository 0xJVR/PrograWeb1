// Middleware para validar JWT en rutas protegidas
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware para autenticar usuarios mediante JWT
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token de autenticación no proporcionado' 
    });
  }

  // El token viene en formato "Bearer TOKEN"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Formato de token inválido' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido o expirado' 
    });
  }
};

/**
 * Middleware para verificar que el usuario tiene rol de administrador
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requieren privilegios de administrador' 
    });
  }
};

module.exports = { authenticateJWT, requireAdmin };
