/**
 * Script para generar entradas en la colección "participantallocations" 
 * basándose en la información de "sharedsessions"
 * 
 * Ejecutar: node server/scripts/generateParticipantAllocations.js
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configurar la URI de MongoDB
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';

// Importar modelos
let SharedSession, ParticipantAllocation, User;

// Función para inicializar la conexión y modelos
async function init() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB conectado...');

    // Cargar modelos
    SharedSession = require('../models/SharedSession');
    ParticipantAllocation = require('../models/ParticipantAllocation');
    User = require('../models/User');
    console.log('Modelos cargados correctamente...');
  } catch (err) {
    console.error('Error al inicializar:', err);
    process.exit(1);
  }
}

// Función para obtener el nombre real del usuario
async function getUserRealName(userId) {
  try {
    const user = await User.findById(userId);
    return user ? (user.nombre || user.email) : 'Usuario';
  } catch (error) {
    console.error(`Error al obtener el usuario ${userId}:`, error);
    return 'Usuario';
  }
}

// Función principal para generar las asignaciones
async function generateParticipantAllocations() {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    console.log('Iniciando generación de asignaciones de participantes...');
    
    // Obtener todas las sesiones compartidas
    const sharedSessions = await SharedSession.find({}).session(dbSession);
    console.log(`Se encontraron ${sharedSessions.length} sesiones compartidas.`);
    
    let totalAllocationsCreated = 0;
    
    // Procesar cada sesión
    for (const session of sharedSessions) {
      console.log(`\nProcesando sesión: ${session.name} (${session._id})`);
      
      // Verificar si la sesión tiene gastos por año/mes
      if (!session.yearlyExpenses || !Array.isArray(session.yearlyExpenses) || session.yearlyExpenses.length === 0) {
        console.log(`  La sesión no tiene gastos registrados, saltando...`);
        continue;
      }
      
      // Verificar si la sesión tiene asignaciones
      if (!session.allocations || !Array.isArray(session.allocations) || session.allocations.length === 0) {
        console.log(`  La sesión no tiene asignaciones de porcentajes, saltando...`);
        continue;
      }
      
      // Verificar que la suma de porcentajes sea 100%
      const sumPercentages = session.allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
      if (Math.abs(sumPercentages - 100) > 0.01) {
        console.log(`  Advertencia: La suma de porcentajes es ${sumPercentages.toFixed(2)}%, debería ser 100%`);
      }
      
      // Actualizar nombres de usuario en las asignaciones
      for (const allocation of session.allocations) {
        if (allocation.name === 'Usuario' && allocation.userId) {
          allocation.name = await getUserRealName(allocation.userId);
          console.log(`  Actualizado nombre de usuario ${allocation.userId} a "${allocation.name}"`);
        }
      }
      
      // Guardar los cambios en la sesión
      await session.save({ session: dbSession });
      
      let allocationsForSession = 0;
      
      // Procesar cada año y mes en la sesión
      for (const yearData of session.yearlyExpenses) {
        const year = yearData.year;
        
        for (const monthData of yearData.months) {
          const month = monthData.month;
          const totalAmount = monthData.totalAmount;
          
          if (!totalAmount || totalAmount <= 0) {
            console.log(`  Saltando año ${year}, mes ${month}: totalAmount es ${totalAmount}`);
            continue;
          }
          
          console.log(`  Procesando año ${year}, mes ${month}, monto: ${totalAmount} ${session.currency}`);
          
          // Verificar si ya existen asignaciones para esta combinación
          const existingAllocations = await ParticipantAllocation.find({
            sessionId: session._id,
            year: year,
            month: month
          }).session(dbSession);
          
          if (existingAllocations.length > 0) {
            console.log(`  Ya existen ${existingAllocations.length} asignaciones para esta combinación, saltando...`);
            continue;
          }
          
          // Crear asignaciones para cada participante
          const allocationsToCreate = [];
          
          for (const allocation of session.allocations) {
            // Calcular monto asignado
            const amount = parseFloat((totalAmount * (allocation.percentage / 100)).toFixed(2));
            
            allocationsToCreate.push({
              _id: new mongoose.Types.ObjectId(),
              sessionId: session._id,
              userId: allocation.userId,
              username: allocation.name,
              year: year,
              month: month,
              amount: amount,
              totalAmount: totalAmount,
              percentage: allocation.percentage,
              currency: session.currency,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          
          // Comprobar la suma después del redondeo
          const totalAllocated = allocationsToCreate.reduce((sum, alloc) => sum + alloc.amount, 0);
          
          // Ajustar diferencias de redondeo al primer participante
          if (Math.abs(totalAllocated - totalAmount) > 0.01 && allocationsToCreate.length > 0) {
            const diff = parseFloat((totalAmount - totalAllocated).toFixed(2));
            allocationsToCreate[0].amount = parseFloat((allocationsToCreate[0].amount + diff).toFixed(2));
            console.log(`  Ajuste por redondeo: ${diff} ${session.currency} asignado al primer participante`);
          }
          
          // Insertar las asignaciones en la base de datos
          if (allocationsToCreate.length > 0) {
            await ParticipantAllocation.insertMany(allocationsToCreate, { session: dbSession });
            console.log(`  Creadas ${allocationsToCreate.length} asignaciones para año ${year}, mes ${month}`);
            allocationsForSession += allocationsToCreate.length;
            totalAllocationsCreated += allocationsToCreate.length;
          }
        }
      }
      
      console.log(`  Total para sesión ${session.name}: ${allocationsForSession} asignaciones`);
    }
    
    // Confirmar la transacción
    await dbSession.commitTransaction();
    console.log(`\nProceso completado con éxito. Se crearon ${totalAllocationsCreated} asignaciones en total.`);
    
  } catch (error) {
    // Revertir la transacción en caso de error
    await dbSession.abortTransaction();
    console.error('Error durante el proceso:', error);
  } finally {
    dbSession.endSession();
  }
}

// Ejecutar el proceso completo
async function run() {
  try {
    await init();
    await generateParticipantAllocations();
  } catch (error) {
    console.error('Error en el proceso:', error);
  } finally {
    // Cerrar la conexión a MongoDB
    mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada.');
  }
}

run(); 