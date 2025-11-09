// Rutas del CRUD de productos
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateJWT, requireAdmin } = require('../middleware/authenticateJWT');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware para manejar subida de archivos
const handleFileUpload = (req, res, next) => {
  if (!req.files || !req.files.image) {
    return next();
  }

  const imageFile = req.files.image;
  
  // Validar tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(imageFile.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido. Solo se permiten imágenes (jpg, png, gif, webp)'
    });
  }

  // Validar tamaño (máximo 5MB)
  if (imageFile.size > 5 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande. Máximo 5MB'
    });
  }

  // Generar nombre único para el archivo
  const timestamp = Date.now();
  const extension = path.extname(imageFile.name);
  const filename = `product_${timestamp}${extension}`;
  const filepath = path.join(uploadsDir, filename);
  
  // Guardar archivo
  imageFile.mv(filepath, (err) => {
    if (err) {
      console.error('Error al guardar archivo:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al guardar la imagen'
      });
    }
    
    // Guardar la URL pública en req.body
    req.body.image = `/uploads/${filename}`;
    next();
  });
};

/**
 * GET /api/products
 * Listar todos los productos (público)
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({
      success: true,
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
 * GET /api/products/:id
 * Obtener un producto por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
});

/**
 * POST /api/products
 * Crear nuevo producto (solo admin)
 */
router.post('/', authenticateJWT, requireAdmin, handleFileUpload, async (req, res) => {
  try {
    const { name, price, description, image } = req.body;

    // Validar campos requeridos
    if (!name || !price || !description) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, precio y descripción son requeridos'
      });
    }

    const product = new Product({
      name,
      price,
      description,
      image: image,
      createdBy: req.user.id
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      product
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: error.message
    });
  }
});

/**
 * PUT /api/products/:id
 * Actualizar producto (solo admin)
 */
router.put('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { name, price, description, image } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Actualizar campos
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (description !== undefined) product.description = description;
    if (image !== undefined) product.image = image; // Solo actualizar si se proporciona

    await product.save();

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      product
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
});

/**
 * POST /api/products/:id/image
 * Subir nueva imagen para un producto (solo admin)
 */
router.post('/:id/image', authenticateJWT, requireAdmin, handleFileUpload, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    if (!req.body.image) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ninguna imagen'
      });
    }

    // Actualizar solo la imagen
    product.image = req.body.image;
    await product.save();

    res.json({
      success: true,
      message: 'Imagen actualizada exitosamente',
      product
    });
  } catch (error) {
    console.error('Error al actualizar imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar imagen',
      error: error.message
    });
  }
});

/**
 * DELETE /api/products/:id
 * Eliminar producto (solo admin)
 */
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
});

module.exports = router;
