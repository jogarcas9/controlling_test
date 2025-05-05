/**
 * Script para sincronizar todas las asignaciones con nombres de usuario correctos.
 * Este script corrige específicamente el problema de los nombres de usuario en los gastos personales.
 * 
 * Ejecución: node server/scripts/fixAllocationsWithUserNames.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ParticipantAllocation, PersonalExpense, SharedSession, User } = require('../models');
const syncService = require('../services/syncService');

// URL de MongoDB - La misma que se usa en el resto de la aplicación
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';

// Conexión a MongoDB
const connectDB = async () => {
  try {
    console.log('Intentando conectar a MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    console.log('Por favor verifica que:');
    console.log('1. La URL de conexión es correcta');
    console.log('2. El servidor MongoDB está ejecutándose');
    console.log('3. Las credenciales son correctas (si aplica)');
    process.exit(1);
  }
};

// Función principal
const main = async () => {
  console.log('Iniciando sincronización con nombres de usuario correctos...');
  
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
        console.log(`\n--- Procesando asignación ${allocation._id} (${stats.processed + 1}/${stats.total}) ---`);
        
        // Obtener información completa del usuario para mejorar el nombre en el gasto
        let userName = allocation.name;
        try {
          const user = await User.findById(allocation.userId);
          if (user) {
            userName = user.username || user.name || user.nombre || allocation.name;
            console.log(`  Usuario encontrado: ${userName} (ID: ${allocation.userId})`);
            
            // Actualizar el nombre en la asignación si es diferente
            if (allocation.name !== userName && userName !== 'usuario') {
              console.log(`  Actualizando nombre en asignación de "${allocation.name}" a "${userName}"`);
              allocation.name = userName;
              await allocation.save();
            }
          } else {
            console.log(`  No se encontró información del usuario con ID: ${allocation.userId}`);
          }
        } catch (userError) {
          console.warn(`  Error al obtener información de usuario: ${userError.message}`);
        }
        
        // Verificar si la asignación ya tiene un gasto personal asociado
        if (allocation.personalExpenseId) {
          // Comprobar si el gasto existe
          const existingExpense = await PersonalExpense.findById(allocation.personalExpenseId);
          
          if (existingExpense) {
            console.log(`  Gasto personal existente: ${existingExpense._id}`);
            console.log(`  Descripción actual: ${existingExpense.description}`);
            
            // Actualizar la descripción para incluir el nombre correcto
            if (!existingExpense.description.includes(userName)) {
              const sessionName = existingExpense.name;
              existingExpense.description = `Gasto compartido - ${sessionName} (${userName})`;
              
              // Asegurarse de que el user es string
              if (existingExpense.user && typeof existingExpense.user !== 'string') {
                existingExpense.user = existingExpense.user.toString();
              }
              
              await existingExpense.save();
              console.log(`  Descripción actualizada: ${existingExpense.description}`);
            }
          } else {
            console.log(`  Referencia a gasto personal ${allocation.personalExpenseId} no existe, recreando...`);
            allocation.personalExpenseId = null;
            await allocation.save();
          }
        }
        
        // Forzar sincronización para crear o actualizar el gasto
        try {
          const result = await syncService.syncAllocationToPersonalExpense(allocation);
          
          if (result.success) {
            console.log(`  ✅ Sincronización exitosa: Gasto ${result.personalExpense ? result.personalExpense._id : 'creado'}`);
            stats.successful++;
          } else {
            console.log(`  ❌ Sincronización fallida`);
            stats.failed++;
            stats.errors.push({
              allocationId: allocation._id.toString(),
              userId: allocation.userId.toString(),
              name: allocation.name,
              error: 'Sincronización fallida sin error específico'
            });
          }
        } catch (error) {
          console.error(`  ❌ Error procesando asignación ${allocation._id}:`, error.message);
          
          // Si es un error de conflicto de escritura, esperar y reintentar
          if (error.name === 'MongoServerError' && error.code === 112) {
            console.log('   Detectado conflicto de escritura, esperando 1 segundo antes de continuar...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          stats.failed++;
          stats.errors.push({
            allocationId: allocation._id.toString(),
            userId: allocation.userId.toString(),
            name: allocation.name,
            error: error.message
          });
        }
      } catch (error) {
        console.error(`  ❌ Error procesando asignación ${allocation._id}:`, error.message);
        stats.failed++;
        stats.errors.push({
          allocationId: allocation._id.toString(),
          userId: allocation.userId.toString(),
          name: allocation.name,
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
    console.log('\n--- Resumen de la sincronización ---');
    console.log(`- Total asignaciones: ${stats.total}`);
    console.log(`- Procesadas: ${stats.processed}`);
    console.log(`- Exitosas: ${stats.successful}`);
    console.log(`- Fallidas: ${stats.failed}`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrores encontrados:');
      stats.errors.forEach((err, index) => {
        console.log(`${index + 1}. Asignación ${err.allocationId} (Usuario: ${err.name}): ${err.error}`);
      });
    }
    
    // Verificar resultados finales
    const personalExpenses = await PersonalExpense.find({ 
      allocationId: { $exists: true, $ne: null } 
    });
    
    console.log(`\nVerificación final: ${personalExpenses.length} gastos personales con asignaciones`);
    console.log('Muestra de gastos creados:');
    
    // Mostrar algunos ejemplos para verificación
    const sampleSize = Math.min(5, personalExpenses.length);
    for (let i = 0; i < sampleSize; i++) {
      const exp = personalExpenses[i];
      console.log(`- Gasto ${i+1}: "${exp.name}" (${exp.description}), Monto: ${exp.amount} ${exp.currency}, Usuario: ${exp.user}`);
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