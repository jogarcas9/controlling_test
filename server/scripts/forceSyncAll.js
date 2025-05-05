/**
 * Script para forzar la sincronización de todas las asignaciones existentes
 * con gastos personales, independientemente de si ya tienen referencia o no.
 * 
 * Ejecución: node server/scripts/forceSyncAll.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ParticipantAllocation, PersonalExpense, SharedSession } = require('../models');
const syncService = require('../services/syncService');

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
  console.log('Iniciando sincronización forzada de todas las asignaciones...');
  
  // Conectar a la base de datos
  const conn = await connectDB();
  
  // Estadísticas
  const stats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  try {
    // Obtener todas las asignaciones
    const allocations = await ParticipantAllocation.find({});
    stats.total = allocations.length;
    
    console.log(`Se encontraron ${stats.total} asignaciones para procesar`);
    
    // Procesar cada asignación
    for (const allocation of allocations) {
      try {
        console.log(`Procesando asignación ${allocation._id} (${stats.processed + 1}/${stats.total})`);
        
        // Obtener la sesión para verificar que existe
        const session = await SharedSession.findById(allocation.sessionId);
        if (!session) {
          console.log(`  Saltando: No se encontró la sesión ${allocation.sessionId}`);
          stats.errors.push({
            allocationId: allocation._id.toString(),
            error: `Sesión no encontrada: ${allocation.sessionId}`
          });
          stats.failed++;
          continue;
        }
        
        // Verificar si ya tiene un gasto asociado
        if (allocation.personalExpenseId) {
          const existingExpense = await PersonalExpense.findById(allocation.personalExpenseId);
          if (existingExpense) {
            console.log(`  Ya tiene gasto asociado: ${existingExpense._id}`);
          } else {
            console.log(`  Tiene referencia a gasto ${allocation.personalExpenseId} que no existe`);
            allocation.personalExpenseId = null; // Limpiar referencia inválida
            await allocation.save();
          }
        }
        
        // Forzar sincronización
        const result = await syncService.syncAllocationToPersonalExpense(allocation);
        
        if (result.success) {
          console.log(`  ✅ Sincronización exitosa: Gasto ${result.personalExpense._id}`);
          stats.successful++;
        } else {
          console.log(`  ❌ Sincronización fallida`);
          stats.failed++;
          stats.errors.push({
            allocationId: allocation._id.toString(),
            error: 'Sincronización fallida sin error específico'
          });
        }
      } catch (error) {
        console.error(`  ❌ Error procesando asignación ${allocation._id}:`, error.message);
        stats.failed++;
        stats.errors.push({
          allocationId: allocation._id.toString(),
          error: error.message
        });
      }
      
      stats.processed++;
      
      // Mostrar progreso cada 5 asignaciones
      if (stats.processed % 5 === 0 || stats.processed === stats.total) {
        console.log(`Progreso: ${stats.processed}/${stats.total} (${Math.round(stats.processed/stats.total*100)}%)`);
      }
    }
    
    // Resumen
    console.log('\nResumen de la sincronización forzada:');
    console.log(`- Total asignaciones: ${stats.total}`);
    console.log(`- Procesadas: ${stats.processed}`);
    console.log(`- Exitosas: ${stats.successful}`);
    console.log(`- Fallidas: ${stats.failed}`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrores encontrados:');
      stats.errors.forEach((err, index) => {
        console.log(`${index + 1}. Asignación ${err.allocationId}: ${err.error}`);
      });
    }
    
  } catch (error) {
    console.error('Error global durante la sincronización:', error);
  } finally {
    // Cerrar conexión con la base de datos
    await mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar el script
main(); 