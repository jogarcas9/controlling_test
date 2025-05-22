const mongoose = require('mongoose');
const allocationSyncService = require('./services/allocationSyncService');
const { SharedSession, ParticipantAllocation } = require('./models');
const path = require('path');
const fs = require('fs');

// ID de la sesión mostrada en MongoDB Compass
const SESSION_ID = '682c6255a4d885d9754a0554';

// Función para sincronizar la sesión compartida con asignaciones
async function syncSession() {
  try {
    console.log('Iniciando sincronización de asignaciones...');
    
    // Conexión a la base de datos correcta proporcionada por el usuario
    try {
      console.log('Intentando conectar a la base de datos remota (Atlas)...');
      await mongoose.connect('mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Conectado a la base de datos remota (Atlas)');
    } catch (error) {
      console.error('❌ Error al conectar a la base de datos:', error.message);
      return;
    }
    
    // Verificar que la sesión existe
    const session = await SharedSession.findById(SESSION_ID);
    if (!session) {
      console.error(`No se encontró la sesión con ID ${SESSION_ID} en la base de datos remota (Atlas)`);
      
      // Intentar listar sesiones disponibles
      console.log('Buscando sesiones disponibles...');
      const sessions = await SharedSession.find().limit(5);
      if (sessions && sessions.length > 0) {
        console.log(`Se encontraron ${sessions.length} sesiones:`);
        sessions.forEach((s, i) => {
          console.log(`${i+1}. ID: ${s._id}, Nombre: ${s.name}`);
        });
      } else {
        console.log('No se encontraron sesiones en la base de datos.');
      }
      return;
    }
    
    console.log(`Sesión encontrada: ${session.name}`);
    
    // Sincronizar TODOS los meses con datos en lugar de uno específico
    try {
      console.log('\nSincronizando TODOS los meses con datos...');
      await allocationSyncService.resyncEntireSession(SESSION_ID);
      console.log('✅ Sincronización de todos los meses completada');
    } catch (syncError) {
      console.error('❌ Error durante la sincronización:', syncError.message);
      console.error(syncError.stack);
    }
    
    // Verificar las asignaciones después de sincronizar
    const allocations = await ParticipantAllocation.find({
      sessionId: SESSION_ID
    }).sort({ year: 1, month: 1 });
    
    console.log(`\nAsignaciones encontradas después de sincronizar: ${allocations.length}`);
    if (allocations.length > 0) {
      console.log('Resumen de asignaciones por mes:');
      const months = {};
      
      for (const alloc of allocations) {
        const key = `${alloc.year}-${alloc.month+1}`;
        if (!months[key]) {
          months[key] = [];
        }
        months[key].push(alloc);
      }
      
      for (const [monthKey, monthAllocations] of Object.entries(months)) {
        console.log(`\nMes ${monthKey}:`);
        for (const alloc of monthAllocations) {
          console.log(`- Usuario: ${alloc.name}`);
          console.log(`  Monto: ${alloc.amount}`);
          console.log(`  Gastos: ${alloc.expenses ? alloc.expenses.length : 0}`);
          console.log('------------------');
        }
      }
    } else {
      console.log('❌ No se encontraron asignaciones después de la sincronización.');
    }
    
  } catch (error) {
    console.error('Error general:', error.message);
    console.error(error.stack);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Desconectado de MongoDB');
    }
  }
}

// Ejecutar la sincronización
syncSession();