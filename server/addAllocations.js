const mongoose = require('mongoose');
const { SharedSession } = require('./models');

// ID de la sesión mostrada en MongoDB Compass
const SESSION_ID = '682c6255a4d885d9754a0554';

// Función para añadir asignaciones a la sesión compartida
async function addAllocations() {
  try {
    console.log('Iniciando configuración de asignaciones...');
    
    // Conexión a la base de datos
    try {
      console.log('Conectando a la base de datos remota (Atlas)...');
      await mongoose.connect('mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Conectado a la base de datos remota (Atlas)');
    } catch (error) {
      console.error('❌ Error al conectar a la base de datos:', error.message);
      return;
    }
    
    // Obtener la sesión compartida
    const session = await SharedSession.findById(SESSION_ID);
    if (!session) {
      console.error(`No se encontró la sesión con ID ${SESSION_ID}`);
      return;
    }
    
    console.log(`Sesión encontrada: ${session.name}`);
    console.log(`Participantes: ${session.participants.length}`);
    
    // Mostrar participantes actuales
    session.participants.forEach((p, i) => {
      console.log(`Participante ${i+1}: ${p.name} (${p.email}), userId: ${p.userId}`);
    });
    
    // Mostrar asignaciones actuales
    console.log(`\nAsignaciones actuales: ${session.allocations ? session.allocations.length : 0}`);
    if (session.allocations && session.allocations.length > 0) {
      session.allocations.forEach((a, i) => {
        console.log(`Asignación ${i+1}: ${a.name} (${a.percentage}%)`);
      });
    }
    
    // Crear nuevas asignaciones si no existen
    if (!session.allocations || session.allocations.length === 0) {
      console.log('\nCreando nuevas asignaciones...');
      
      // Array para almacenar las nuevas asignaciones
      const newAllocations = [];
      
      // Distribución por defecto: 50% cada uno si hay dos participantes
      const defaultPercentage = session.participants.length === 2 ? 50 : 100 / session.participants.length;
      
      // Crear una asignación para cada participante
      for (const participant of session.participants) {
        if (!participant.userId) {
          console.log(`Omitiendo participante ${participant.name} sin userId`);
          continue;
        }
        
        console.log(`Añadiendo asignación para ${participant.name}: ${defaultPercentage}%`);
        newAllocations.push({
          userId: participant.userId,
          name: participant.name,
          percentage: defaultPercentage
        });
      }
      
      // Actualizar la sesión con las nuevas asignaciones
      session.allocations = newAllocations;
      await session.save();
      
      console.log(`✅ Se han creado ${newAllocations.length} asignaciones`);
    } else {
      console.log('\nYa existen asignaciones, no se realizarán cambios.');
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

// Ejecutar
addAllocations(); 