require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-productos',
  jwtSecret: process.env.JWT_SECRET || 'clave_secreta_por_defecto',
  jwtExpiresIn: '24h',
  nodeEnv: process.env.NODE_ENV || 'development'
};
