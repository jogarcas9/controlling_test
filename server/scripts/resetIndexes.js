const mongoose = require('mongoose');
require('dotenv').config();

const resetIndexes = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener la colección
    const collection = mongoose.connection.collection('sharedsessions');
    
    // Eliminar todos los índices excepto _id
    console.log('Eliminando índices existentes...');
    await collection.dropIndexes();
    console.log('Índices eliminados');

    // Crear nuevos índices
    console.log('Creando nuevos índices...');
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ 'participants.email': 1, '_id': 1 }, { unique: false });
    await collection.createIndex({ 'participants.userId': 1, '_id': 1 }, { unique: false });
    await collection.createIndex({ status: 1 });

    // Verificar índices
    const indexes = await collection.indexes();
    console.log('Índices actuales:', indexes);

    console.log('Proceso completado');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
};

resetIndexes(); 