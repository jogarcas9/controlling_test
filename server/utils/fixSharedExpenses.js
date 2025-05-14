/**
 * Script para corregir problemas de nombres de usuario y duplicación de asignaciones
 * en sesiones compartidas específicas.
 * 
 * Este script:
 * 1. Corrige los nombres de usuario en asignaciones para mostrar el nombre real
 * 2. Elimina asignaciones duplicadas manteniendo solo la más reciente
 * 
 * Uso: node server/utils/fixSharedExpenses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { syncService } = require('../services');

// IDs de las sesiones específicas a corregir
const TARGET_SESSIONS = [
  // ID de la sesión "Hogar"
  '681b3da55c74e5c85e70a8d4',
  // ID del registro de gasto compartido
  '68244b6485d28d0e2c7207f3'
];

// Conexión a MongoDB
const connectDB = async () => {
  try {
    // Obtener URL de MongoDB desde .env o usar una URL por defecto
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/controlling_app';
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB conectado...');
    
    // Cargar modelos necesarios para el script
    require('../models/User');
    require('../models/ParticipantAllocation');
    require('../models/PersonalExpense');
    require('../models/SharedSession');
    
    console.log('Modelos cargados correctamente.');
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

// Función para corregir una sesión específica
const fixSession = async (sessionId) => {
  console.log(`\n==== INICIANDO CORRECCIÓN PARA SESIÓN: ${sessionId} ====\n`);
  
  try {
    // Paso 1: Corregir asignaciones duplicadas
    console.log('\n--- Paso 1: Eliminando asignaciones duplicadas ---');
    const duplicatesResult = await syncService.fixDuplicateAllocations(sessionId);
    console.log(JSON.stringify(duplicatesResult, null, 2));
    
    // Paso 2: Actualizar nombres de usuario
    console.log('\n--- Paso 2: Actualizando nombres de usuario ---');
    const namesResult = await syncService.updateUserNamesInAllocations(sessionId);
    console.log(JSON.stringify(namesResult, null, 2));
    
    console.log(`\n==== CORRECCIÓN COMPLETADA PARA SESIÓN: ${sessionId} ====\n`);
  } catch (error) {
    console.error(`Error corrigiendo sesión ${sessionId}:`, error);
  }
};

// Función principal
const main = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    console.log('\n***** INICIANDO CORRECCIÓN DE SESIONES COMPARTIDAS *****\n');
    
    // Procesar cada sesión específica
    for (const sessionId of TARGET_SESSIONS) {
      await fixSession(sessionId);
    }
    
    console.log('\n***** CORRECCIÓN FINALIZADA *****\n');
    console.log('Resumen:');
    console.log('- Se procesaron', TARGET_SESSIONS.length, 'sesiones');
    console.log('- Los nombres de usuario fueron actualizados con los valores reales de la colección User');
    console.log('- Las asignaciones duplicadas fueron eliminadas, manteniendo la más reciente');
    
    // Desconectar de la base de datos
    mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada');
    process.exit(0);
  } catch (error) {
    console.error('Error en el proceso principal:', error);
    process.exit(1);
  }
};

// Ejecutar el script
main(); 