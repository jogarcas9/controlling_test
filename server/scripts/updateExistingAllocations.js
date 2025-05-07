/**
 * Script para actualizar todas las asignaciones de participantes existentes
 * basándose en los gastos actuales en sesiones compartidas
 * 
 * Ejecutar: node server/scripts/updateExistingAllocations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Configurar la URI de MongoDB
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';

// Importar modelos
let SharedSession, ParticipantAllocation, User, PersonalExpense;

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
    PersonalExpense = require('../models/PersonalExpense');
    console.log('Modelos cargados correctamente...');
  } catch (err) {
    console.error('Error al inicializar:', err);
    process.exit(1);
  }
}

// Función para generar asignaciones para una sesión, año y mes específicos
async function generateAllocationsForMonth(session, year, month) {
  try {
    // Buscar si el año y mes existen en la sesión
    const yearData = session.yearlyExpenses.find(y => y.year === year);
    if (!yearData) {
      console.log(`El año ${year} no existe en la sesión ${session.name}`);
      return null;
    }

    const monthData = yearData.months.find(m => m.month === month);
    if (!monthData) {
      console.log(`El mes ${month} no existe en el año ${year} para la sesión ${session.name}`);
      return null;
    }

    const totalAmount = monthData.totalAmount;
    if (!totalAmount || totalAmount <= 0) {
      console.log(`No hay gastos para ${year}-${month+1} en la sesión ${session.name}`);
      return null;
    }

    // Verificar que haya asignaciones de porcentajes
    if (!session.allocations || !Array.isArray(session.allocations) || session.allocations.length === 0) {
      console.log(`No hay asignaciones de porcentajes en la sesión ${session.name}`);
      return null;
    }

    // Eliminar asignaciones existentes para esta combinación
    const deleteResult = await ParticipantAllocation.deleteMany({
      sessionId: session._id,
      year,
      month
    });
    console.log(`Eliminadas ${deleteResult.deletedCount} asignaciones previas para ${year}-${month+1}`);

    // Crear asignaciones para cada participante
    const allocationsToCreate = [];
    
    for (const allocation of session.allocations) {
      // Calcular monto asignado
      const amount = parseFloat((totalAmount * (allocation.percentage / 100)).toFixed(2));
      
      allocationsToCreate.push({
        _id: new mongoose.Types.ObjectId(),
        sessionId: session._id,
        userId: allocation.userId,
        username: allocation.name || 'Usuario',
        year,
        month,
        amount,
        totalAmount,
        percentage: allocation.percentage,
        currency: session.currency || 'EUR',
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
      console.log(`Ajuste por redondeo: ${diff} ${session.currency} asignado al primer participante`);
    }
    
    // Insertar las asignaciones en la base de datos
    if (allocationsToCreate.length > 0) {
      const result = await ParticipantAllocation.insertMany(allocationsToCreate);
      console.log(`Creadas ${result.length} asignaciones para año ${year}, mes ${month+1}`);
      
      // Crear/actualizar gastos personales para cada asignación
      console.log(`Sincronizando con gastos personales...`);
      let personalesCreados = 0;
      let personalesActualizados = 0;
      
      for (const allocation of result) {
        try {
          // Verificar si ya existe un gasto personal para esta asignación
          const existingExpense = await PersonalExpense.findOne({
            user: allocation.userId.toString(),
            'sessionReference.sessionId': session._id,
            year: year,
            month: month
          });
          
          // Crear la fecha para el día 15 del mes correspondiente
          const expenseDate = new Date(year, month, 15);
          
          if (existingExpense) {
            // Actualizar el gasto existente
            existingExpense.amount = allocation.amount;
            existingExpense.allocationId = allocation._id;
            existingExpense.date = expenseDate;
            await existingExpense.save();
            
            // Actualizar el ID del gasto personal en la asignación
            await ParticipantAllocation.findByIdAndUpdate(
              allocation._id,
              { personalExpenseId: existingExpense._id }
            );
            
            personalesActualizados++;
            console.log(`  Actualizado gasto personal ${existingExpense._id}`);
          } else {
            // Crear un nuevo gasto personal
            const newExpense = new PersonalExpense({
              user: allocation.userId.toString(),
              name: session.name,
              description: `Gastos compartidos: ${session.name} (${allocation.percentage}%)`,
              amount: allocation.amount,
              currency: allocation.currency || 'EUR',
              category: 'Gastos Compartidos',
              date: expenseDate,
              type: 'expense',
              allocationId: allocation._id,
              sessionReference: {
                sessionId: session._id,
                sessionName: session.name,
                percentage: allocation.percentage,
                isRecurringShare: session.sessionType === 'permanent'
              }
            });
            
            const savedExpense = await newExpense.save();
            
            // Actualizar la asignación con el ID del gasto personal
            await ParticipantAllocation.findByIdAndUpdate(
              allocation._id,
              { personalExpenseId: savedExpense._id }
            );
            
            personalesCreados++;
            console.log(`  Creado nuevo gasto personal ${savedExpense._id}`);
          }
        } catch (error) {
          console.error(`  Error al sincronizar gasto personal para asignación ${allocation._id}:`, error);
        }
      }
      
      console.log(`Sincronización completada: ${personalesCreados} gastos creados, ${personalesActualizados} actualizados`);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error(`Error al generar asignaciones para ${year}-${month+1}:`, error);
    return null;
  }
}

// Función principal para actualizar todas las asignaciones
async function updateAllAllocations() {
  try {
    console.log('Iniciando actualización de todas las asignaciones...');
    
    // Obtener todas las sesiones compartidas
    const sharedSessions = await SharedSession.find({});
    console.log(`Se encontraron ${sharedSessions.length} sesiones compartidas.`);
    
    let totalAllocationsCreated = 0;
    let totalAllocationsDeleted = 0;
    let totalPersonalExpensesCreated = 0;
    let totalPersonalExpensesUpdated = 0;
    
    // Primero, eliminar todos los gastos personales vinculados a sesiones compartidas
    const deletePersonalExpensesResult = await PersonalExpense.deleteMany({
      'sessionReference.sessionId': { $exists: true, $ne: null }
    });
    console.log(`Eliminados ${deletePersonalExpensesResult.deletedCount} gastos personales previos vinculados a sesiones compartidas`);
    
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
      
      let sessionAllocationsCreated = 0;
      let sessionPersonalExpensesCreated = 0;
      
      // Actualizar nombres de usuario en las asignaciones si son "Usuario"
      let sessionUpdated = false;
      for (const allocation of session.allocations) {
        if (allocation.name === 'Usuario' && allocation.userId) {
          try {
            const user = await User.findById(allocation.userId);
            if (user) {
              allocation.name = user.nombre || user.email;
              sessionUpdated = true;
              console.log(`  Actualizado nombre de usuario ${allocation.userId} a "${allocation.name}"`);
            }
          } catch (error) {
            console.error(`  Error al buscar usuario ${allocation.userId}:`, error);
          }
        }
      }
      
      // Guardar los cambios en la sesión si se actualizaron nombres
      if (sessionUpdated) {
        await session.save();
        console.log(`  Guardados cambios en los nombres de usuario`);
      }
      
      // Eliminar todas las asignaciones existentes para esta sesión
      const deleteResult = await ParticipantAllocation.deleteMany({ sessionId: session._id });
      totalAllocationsDeleted += deleteResult.deletedCount;
      console.log(`  Eliminadas ${deleteResult.deletedCount} asignaciones previas para toda la sesión`);
      
      // Procesar cada año y mes en la sesión
      for (const yearData of session.yearlyExpenses) {
        const year = yearData.year;
        
        if (!yearData.months || !Array.isArray(yearData.months)) {
          console.log(`  El año ${year} no tiene meses definidos, saltando...`);
          continue;
        }
        
        for (const monthData of yearData.months) {
          if (!monthData) continue;
          
          const month = monthData.month;
          const totalAmount = monthData.totalAmount || 0;
          
          if (totalAmount <= 0) {
            console.log(`  Saltando año ${year}, mes ${month+1}: no hay gastos (totalAmount = ${totalAmount})`);
            continue;
          }
          
          console.log(`  Procesando año ${year}, mes ${month+1}, monto: ${totalAmount} ${session.currency || 'EUR'}`);
          
          // Generar asignaciones para este mes
          const allocations = await generateAllocationsForMonth(session, year, month);
          
          if (allocations && allocations.length > 0) {
            sessionAllocationsCreated += allocations.length;
            totalAllocationsCreated += allocations.length;
            
            // Contar gastos personales creados
            for (const allocation of allocations) {
              if (allocation.personalExpenseId) {
                sessionPersonalExpensesCreated++;
                totalPersonalExpensesCreated++;
              }
            }
          }
        }
      }
      
      console.log(`  Total para sesión ${session.name}:`);
      console.log(`    - ${sessionAllocationsCreated} asignaciones creadas`);
      console.log(`    - ${sessionPersonalExpensesCreated} gastos personales creados`);
    }
    
    console.log(`\nProceso completado con éxito:`);
    console.log(`- Se eliminaron ${totalAllocationsDeleted} asignaciones antiguas`);
    console.log(`- Se crearon ${totalAllocationsCreated} asignaciones nuevas`);
    console.log(`- Se crearon ${totalPersonalExpensesCreated} gastos personales`);
    
  } catch (error) {
    console.error('Error durante el proceso:', error);
  }
}

// Ejecutar el proceso completo
async function run() {
  try {
    await init();
    await updateAllAllocations();
  } catch (error) {
    console.error('Error en el proceso:', error);
  } finally {
    // Cerrar la conexión a MongoDB
    mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada.');
  }
}

run(); 