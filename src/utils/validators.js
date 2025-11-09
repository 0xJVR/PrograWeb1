// Validadores personalizados para la aplicación

/**
 * Validar formato de email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validar fortaleza de contraseña
 */
const isStrongPassword = (password) => {
  // Mínimo 6 caracteres
  if (password.length < 6) {
    return {
      valid: false,
      message: 'La contraseña debe tener al menos 6 caracteres'
    };
  }

  return { valid: true };
};

/**
 * Validar datos de producto
 * - Acepta URLs absolutas o rutas relativas a /uploads/ para la imagen
 */
const validateProduct = (productData) => {
  const errors = [];

  if (!productData.name || productData.name.trim().length === 0) {
    errors.push('El nombre del producto es requerido');
  }

  if (productData.price === undefined || productData.price === null || isNaN(productData.price) || Number(productData.price) < 0) {
    errors.push('El precio debe ser un número válido mayor o igual a 0');
  }

  if (!productData.description || productData.description.trim().length === 0) {
    errors.push('La descripción es requerida');
  }

  if (productData.image) {
    const img = String(productData.image);
    const isRelativeUpload = img.startsWith('/uploads/');
    if (!isRelativeUpload && !isValidUrl(img)) {
      errors.push('La URL o ruta de la imagen no es válida');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validar URL absoluta
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Sanitizar string para prevenir XSS
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

module.exports = {
  isValidEmail,
  isStrongPassword,
  validateProduct,
  isValidUrl,
  sanitizeString
};
