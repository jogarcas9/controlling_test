/**
 * Script para sincronizar manualmente gastos compartidos a gastos personales
 * para sesiones específicas.
 * 
 * Este script encuentra todas las asignaciones de las sesiones especificadas
 * y las sincroniza con los gastos personales correspondientes, actualizando
 * o creando los registros necesarios.
 * 
 * Uso: node server/utils/syncSharedExpensesToPersonal.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { syncService } = require('../services');

// IDs de las sesiones específicas a sincronizar
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

// Función para sincronizar una sesión específica
const syncSession = async (sessionId) => {
  console.log(`\n==== INICIANDO SINCRONIZACIÓN PARA SESIÓN: ${sessionId} ====\n`);
  
  try {
    // Obtener modelo ParticipantAllocation
    const ParticipantAllocation = mongoose.model('ParticipantAllocation');
    
    // Buscar todas las asignaciones para esta sesión
    const allocations = await ParticipantAllocation.find({ sessionId });
    
    if (!allocations || allocations.length === 0) {
      console.log(`No se encontraron asignaciones para la sesión: ${sessionId}`);
      return;
    }
    
    console.log(`Encontradas ${allocations.length} asignaciones para sincronizar`);
    
    // Sincronizar cada asignación
    let successCount = 0;
    let errorCount = 0;
    
    for (const allocation of allocations) {
      try {
        console.log(`\nSincronizando asignación: ${allocation._id}`);
        console.log(`Usuario: ${allocation.userId}, Monto: ${allocation.amount}, Año: ${allocation.year}, Mes: ${allocation.month}`);
        
        // Usar la función de sincronización del servicio
        const result = await syncService.syncAllocationToPersonalExpense(allocation);
        
        if (result.success) {
          successCount++;
          console.log(`✅ Sincronización exitosa para asignación: ${allocation._id}`);
          if (result.personalExpense) {
            console.log(`Gasto personal: ${result.personalExpense._id}`);
            console.log(`Nombre: ${result.personalExpense.name}`);
            console.log(`Monto: ${result.personalExpense.amount}`);
          }
        } else {
          errorCount++;
          console.log(`❌ Error en sincronización para asignación: ${allocation._id}`);
        }
      } catch (allocError) {
        errorCount++;
        console.error(`Error procesando asignación ${allocation._id}:`, allocError);
      }
    }
    
    console.log(`\n==== SINCRONIZACIÓN COMPLETADA PARA SESIÓN: ${sessionId} ====`);
    console.log(`Exitosas: ${successCount}`);
    console.log(`Errores: ${errorCount}`);
    console.log(`Total: ${allocations.length}`);
  } catch (error) {
    console.error(`Error sincronizando sesión ${sessionId}:`, error);
  }
};

// Función principal
const main = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    console.log('\n***** INICIANDO SINCRONIZACIÓN DE SESIONES COMPARTIDAS *****\n');
    
    // Procesar cada sesión específica
    for (const sessionId of TARGET_SESSIONS) {
      await syncSession(sessionId);
    }
    
    console.log('\n***** SINCRONIZACIÓN FINALIZADA *****\n');
    
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