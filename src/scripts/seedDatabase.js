// Script para inicializar la base de datos con datos de prueba
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const config = require('../config');

const seedData = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(config.mongodbUri);
    console.log('Conectado a MongoDB');

    // Limpiar datos existentes
    console.log('Limpiando datos existentes...');
    await User.deleteMany({});
    await Product.deleteMany({});

    // Crear usuarios de prueba
    console.log('Creando usuarios de prueba...');
    
    const adminUser = new User({
      name: 'Administrador',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'admin'
    });
    await adminUser.save();
    console.log('Usuario admin creado: admin@test.com / admin123');

    const regularUser = new User({
      name: 'Usuario Regular',
      email: 'user@test.com',
      password: 'user123',
      role: 'user'
    });
    await regularUser.save();
    console.log('Usuario regular creado: user@test.com / user123');

    // Crear productos de prueba
    console.log('Creando productos de prueba...');
    
    const products = [
      {
        name: 'Laptop Gaming Pro',
        price: 1299.99,
        description: 'Laptop de alto rendimiento con procesador Intel i9, 32GB RAM y RTX 4070. Perfecta para gaming y trabajo profesional.',
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Smartphone Ultra X',
        price: 899.99,
        description: 'Teléfono inteligente con pantalla AMOLED 6.7", cámara de 108MP y batería de 5000mAh. Tecnología 5G incluida.',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Auriculares Bluetooth Premium',
        price: 249.99,
        description: 'Auriculares inalámbricos con cancelación de ruido activa, 30 horas de batería y sonido de alta fidelidad.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Smart Watch Series 8',
        price: 399.99,
        description: 'Reloj inteligente con monitor de salud 24/7, GPS integrado y resistencia al agua hasta 50m.',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Tablet Pro 12"',
        price: 799.99,
        description: 'Tablet profesional con pantalla de 12 pulgadas, stylus incluido y procesador de última generación.',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Cámara Digital 4K',
        price: 1599.99,
        description: 'Cámara profesional con grabación 4K 60fps, estabilización de imagen y lentes intercambiables.',
        image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Teclado Mecánico RGB',
        price: 149.99,
        description: 'Teclado mecánico para gaming con switches Cherry MX, iluminación RGB personalizable y reposamuñecas.',
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Mouse Gamer Inalámbrico',
        price: 89.99,
        description: 'Mouse gaming con sensor óptico de 25,000 DPI, 11 botones programables y batería de 100 horas.',
        image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      },
      {
        name: 'Monitor Curvo 34"',
        price: 599.99,
        description: 'Monitor ultra wide curvo con resolución QHD, 144Hz y tecnología HDR para experiencia inmersiva.',
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
        createdBy: adminUser._id
      }
    ];

    await Product.insertMany(products);
    console.log(`${products.length} productos creados exitosamente`);

    console.log('\nBase de datos inicializada correctamente!\n');
    console.log('Credenciales de acceso:');
    console.log('   Admin: admin@test.com / admin123');
    console.log('   User: user@test.com / user123\n');

    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
};

seedData();
