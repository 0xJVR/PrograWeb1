// Script para inicializar la base de datos con datos de prueba
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const config = require('../config');

const { Types: { ObjectId } } = mongoose;

const seedData = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(config.mongodbUri);
    console.log('Conectado a MongoDB');

    // Limpiar datos existentes
    console.log('Limpiando datos existentes...');
    await User.deleteMany({});
    await Product.deleteMany({});

    // IDs fijos (para que createdBy coincida con el admin)
    const adminUserId = new ObjectId('6908d6a63b33e35e99a365ca');

    // Crear usuarios de prueba
    console.log('Creando usuarios de prueba...');

    const adminUser = new User({
      _id: adminUserId,
      name: 'Administrador',
      email: 'admin@test.com',
      password: 'admin123', // Asumiendo que el modelo hace hash en pre-save
      role: 'admin',
      createdAt: new Date('2025-11-03T16:21:59.139Z'),
      updatedAt: new Date('2025-11-09T21:26:40.591Z')
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

    // Crear productos de prueba (datos nuevos)
    console.log('Creando productos de prueba...');

    const products = [
      {
        _id: new ObjectId('6908d6a73b33e35e99a365ce'),
        name: 'Laptop Gaming Pro',
        price: 1299.99,
        description: 'Laptop de alto rendimiento con procesador Intel i9, 32GB RAM y RTX 4070. Perfecta para gaming y trabajo profesional.',
        image: '/uploads/product_1762724206816.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.139Z'),
        updatedAt: new Date('2025-11-09T21:36:46.819Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365cf'),
        name: 'Smartphone Ultra X',
        price: 899.99,
        description: 'Teléfono inteligente con pantalla AMOLED 6.7, cámara de 108MP y batería de 5000mAh. Tecnología 5G incluida.',
        image: '/uploads/product_1762724322608.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.139Z'),
        updatedAt: new Date('2025-11-09T21:38:51.129Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365d0'),
        name: 'Auriculares Bluetooth Premium',
        price: 249.99,
        description: 'Auriculares inalámbricos con cancelación de ruido activa, 30 horas de batería y sonido de alta fidelidad.',
        image: '/uploads/product_1762724275617.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.140Z'),
        updatedAt: new Date('2025-11-09T21:37:55.619Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365d1'),
        name: 'Smart Watch Series 8',
        price: 399.99,
        description: 'Reloj inteligente con monitor de salud, GPS integrado y resistencia al agua hasta 50m.',
        image: '/uploads/product_1762723656034.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.141Z'),
        updatedAt: new Date('2025-11-09T21:35:09.882Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365d2'),
        name: 'Tablet Pro 12',
        price: 799.99,
        description: 'Tablet profesional con pantalla de 12 pulgadas, stylus incluido y procesador de última generación.',
        image: '/uploads/product_1762724050865.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.141Z'),
        updatedAt: new Date('2025-11-09T21:35:23.890Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365d3'),
        name: 'Cámara Digital 4K',
        price: 1599.99,
        description: 'Cámara profesional con grabación 4K 60fps, estabilización de imagen y lentes intercambiables.',
        image: '/uploads/product_1762724074970.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.141Z'),
        updatedAt: new Date('2025-11-09T21:34:34.972Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365d4'),
        name: 'Teclado Mecánico RGB',
        price: 149.99,
        description: 'Teclado mecánico para gaming con switches Cherry MX, iluminación RGB personalizable y reposamuñecas.',
        image: '/uploads/product_1762724094742.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.141Z'),
        updatedAt: new Date('2025-11-09T21:34:54.745Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365d5'),
        name: 'Mouse Gamer Inalámbrico',
        price: 89.99,
        description: 'Mouse gaming con sensor óptico de 25,000 DPI, 11 botones programables y batería de 100 horas.',
        image: '/uploads/product_1762723600581.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.142Z'),
        updatedAt: new Date('2025-11-09T21:26:40.591Z')
      },
      {
        _id: new ObjectId('6908d6a73b33e35e99a365d6'),
        name: 'Monitor Curvo',
        price: 599.99,
        description: 'Monitor ultra wide curvo con resolución QHD, 144Hz y tecnología HDR para experiencia inmersiva.',
        image: '/uploads/product_1762723637312.webp',
        createdBy: adminUserId,
        createdAt: new Date('2025-11-03T16:21:59.142Z'),
        updatedAt: new Date('2025-11-09T21:35:16.935Z')
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
