/**
 * Script para sincronizar todas las asignaciones de participantes con gastos personales
 * Este script debe ejecutarse manualmente una vez para establecer la sincronización 
 * inicial de las asignaciones existentes.
 * 
 * Ejecución: node server/scripts/syncAllAllocations.js
 */

require('dotenv').config(); // Cargar variables de entorno
const mongoose = require('mongoose');
const { syncAllAllocations } = require('../utils/syncUtils');

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Función principal
const main = async () => {
  console.log('Iniciando proceso de sincronización masiva...');
  
  // Conectar a la base de datos
  const conn = await connectDB();
  
  try {
    // Ejecutar la sincronización
    const stats = await syncAllAllocations();
    
    console.log('Proceso de sincronización completado con éxito.');
    console.log(`Resumen:
    - Total asignaciones procesadas: ${stats.processed}/${stats.total}
    - Gastos personales creados: ${stats.created}
    - Gastos personales actualizados: ${stats.updated}
    - Errores: ${stats.errors}
    `);
  } catch (error) {
    console.error('Error durante el proceso de sincronización:', error);
  } finally {
    // Cerrar conexión con la base de datos
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar el script
main(); 