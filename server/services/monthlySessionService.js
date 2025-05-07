const mongoose = require('mongoose');
const { SharedSession, MonthlySharedSession, PersonalExpense, ParticipantAllocation } = require('../models');
const syncService = require('./syncService');

/**
 * Crea o actualiza las instancias mensuales para una sesión recurrente
 * @param {Object} parentSession - Sesión compartida principal
 * @param {Number} monthsToGenerate - Número de meses futuros a generar (por defecto 12)
 * @returns {Array} Lista de instancias mensuales creadas/actualizadas
 */
const createMonthlyInstances = async (parentSession, monthsToGenerate = 12) => {
  if (!parentSession || !parentSession._id) {
    throw new Error('Sesión inválida');
  }

  console.log(`Creando instancias mensuales para sesión ${parentSession._id}`);
  
  // Si la sesión no es permanente, no tiene sentido crear instancias mensuales
  if (parentSession.sessionType !== 'permanent') {
    console.log(`La sesión ${parentSession._id} no es permanente, no se crearán instancias mensuales`);
    return [];
  }
  
  // Fecha actual para determinar mes y año iniciales
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() es 0-based
  
  // Crear las instancias mensuales
  try {
    const instances = await MonthlySharedSession.createFutureInstances(
      parentSession,
      currentYear,
      currentMonth,
      monthsToGenerate
    );
    
    console.log(`Creadas/actualizadas ${instances.length} instancias mensuales para sesión ${parentSession._id}`);
    return instances;
  } catch (error) {
    console.error(`Error al crear instancias mensuales:`, error);
    throw error;
  }
};

/**
 * Propaga un gasto a todas las instancias mensuales futuras
 * @param {Object} parentSession - Sesión compartida principal
 * @param {Object} expense - Gasto a propagar
 * @param {Boolean} updateExisting - Si se deben actualizar gastos existentes o no
 * @returns {Array} Instancias actualizadas
 */
const propagateExpenseToMonthlyInstances = async (parentSession, expense, updateExisting = false) => {
  if (!expense.isRecurring) {
    console.log(`El gasto ${expense._id} no es recurrente, no se propagará`);
    return [];
  }
  
  console.log(`Propagando gasto ${expense._id} a instancias mensuales futuras`);
  
  // Obtener todas las instancias mensuales futuras
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Limitar a procesar solo los próximos 3 meses para evitar timeouts
  const maxInstancesPerBatch = 3;
  
  const futureInstances = await MonthlySharedSession.find({
    parentSessionId: parentSession._id,
    $or: [
      { year: { $gt: currentYear } },
      {
        year: currentYear,
        month: { $gte: currentMonth }
      }
    ]
  })
  .sort({ year: 1, month: 1 })
  .limit(maxInstancesPerBatch);
  
  console.log(`Encontradas ${futureInstances.length} instancias mensuales futuras (limitado a ${maxInstancesPerBatch})`);
  
  const updatedInstances = [];
  let expenseDate = new Date(expense.date);
  
  // Procesar cada instancia mensual
  for (const monthlySession of futureInstances) {
    console.log(`Procesando instancia ${monthlySession.yearMonth}`);
    
    // Ajustar la fecha para este mes
    const targetDate = new Date(monthlySession.year, monthlySession.month - 1, expenseDate.getDate());
    
    // Verificar si hay menos días en este mes y ajustar
    const maxDayInMonth = new Date(monthlySession.year, monthlySession.month, 0).getDate();
    if (expenseDate.getDate() > maxDayInMonth) {
      targetDate.setDate(maxDayInMonth);
    }
    
    // Buscar si ya existe un gasto relacionado
    let existingExpense = null;
    if (updateExisting) {
      existingExpense = monthlySession.expenses.find(
        e => e.originalExpenseId && e.originalExpenseId.toString() === expense._id.toString()
      );
    }
    
    if (existingExpense) {
      // Actualizar el gasto existente
      existingExpense.name = expense.name;
      existingExpense.description = expense.description;
      existingExpense.amount = expense.amount;
      existingExpense.category = expense.category;
      existingExpense.paidBy = expense.paidBy;
      existingExpense.date = targetDate;
      existingExpense.isRecurring = true;
      
      console.log(`Actualizado gasto existente en instancia ${monthlySession.yearMonth}`);
    } else {
      // Crear nuevo gasto para esta instancia mensual
      const newExpense = {
        name: expense.name,
        description: expense.description,
        amount: expense.amount,
        date: targetDate,
        category: expense.category,
        paidBy: expense.paidBy,
        isRecurring: true,
        originalExpenseId: expense._id
      };
      
      monthlySession.expenses.push(newExpense);
      
      // Actualizar el monto total
      monthlySession.totalAmount = (monthlySession.totalAmount || 0) + expense.amount;
      
      console.log(`Añadido nuevo gasto a instancia ${monthlySession.yearMonth}`);
    }
    
    try {
      await monthlySession.save();
      updatedInstances.push(monthlySession);
      console.log(`Guardada instancia ${monthlySession.yearMonth}`);
    } catch (error) {
      console.error(`Error al guardar instancia ${monthlySession.yearMonth}:`, error.message);
      // Continuar con las demás instancias
    }
  }
  
  // Programar la propagación de los meses restantes en segundo plano
  if (futureInstances.length === maxInstancesPerBatch) {
    console.log(`Programando propagación de meses adicionales en segundo plano`);
    
    // Esta función se ejecutará en segundo plano sin bloquear la respuesta al usuario
    setTimeout(async () => {
      try {
        const remainingInstances = await MonthlySharedSession.find({
          parentSessionId: parentSession._id,
          $or: [
            { year: { $gt: currentYear } },
            {
              year: currentYear,
              month: { $gt: currentMonth + maxInstancesPerBatch - 1 }
            }
          ]
        }).sort({ year: 1, month: 1 });
        
        console.log(`Procesando ${remainingInstances.length} instancias adicionales en segundo plano`);
        
        for (const monthlySession of remainingInstances) {
          const targetDate = new Date(monthlySession.year, monthlySession.month - 1, expenseDate.getDate());
          
          // Ajustar si hay menos días en este mes
          const maxDayInMonth = new Date(monthlySession.year, monthlySession.month, 0).getDate();
          if (expenseDate.getDate() > maxDayInMonth) {
            targetDate.setDate(maxDayInMonth);
          }
          
          // Crear nuevo gasto para esta instancia mensual
          const newExpense = {
            name: expense.name,
            description: expense.description,
            amount: expense.amount,
            date: targetDate,
            category: expense.category,
            paidBy: expense.paidBy,
            isRecurring: true,
            originalExpenseId: expense._id
          };
          
          monthlySession.expenses.push(newExpense);
          monthlySession.totalAmount = (monthlySession.totalAmount || 0) + expense.amount;
          
          try {
            await monthlySession.save();
            console.log(`Guardada instancia adicional ${monthlySession.yearMonth} en segundo plano`);
          } catch (error) {
            console.error(`Error al guardar instancia adicional ${monthlySession.yearMonth}:`, error.message);
          }
        }
      } catch (error) {
        console.error('Error en la propagación en segundo plano:', error);
      }
    }, 100);
  }
  
  return updatedInstances;
};

/**
 * Sincroniza los gastos de una sesión mensual a los gastos personales
 * @param {String} monthlySessionId - ID de la sesión mensual
 * @returns {Object} Estadísticas de sincronización
 */
const syncMonthlySessionToPersonal = async (monthlySessionId) => {
  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0
  };
  
  // Iniciar sesión de transacción
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  
  try {
    // Cargar la sesión mensual con todos los detalles
    const monthlySession = await MonthlySharedSession.findById(monthlySessionId)
      .populate('expenses.paidBy', 'nombre apellidos name email');
    
    if (!monthlySession) {
      throw new Error(`Sesión mensual no encontrada: ${monthlySessionId}`);
    }
    
    console.log(`Sincronizando gastos de sesión mensual ${monthlySessionId} (${monthlySession.yearMonth})`);
    
    // Primero, eliminar asignaciones previas para esta sesión mensual
    await ParticipantAllocation.deleteMany({ 
      monthlySessionId: monthlySessionId 
    }, { session: dbSession });
    
    // Procesar cada participante y cada gasto
    for (const participant of monthlySession.participants) {
      if (!participant.userId || participant.status !== 'accepted') {
        continue;
      }
      
      const participantId = participant.userId.toString();
      
      // Buscar asignación de porcentaje
      const allocation = monthlySession.allocations.find(
        a => a.userId.toString() === participantId
      );
      
      if (!allocation) {
        stats.skipped++;
        continue;
      }
      
      const percentage = allocation.percentage || 0;
      
      // Procesar cada gasto en la sesión mensual
      for (const expense of monthlySession.expenses) {
        // Calcular la parte que corresponde a este participante
        const participantAmount = (expense.amount * percentage) / 100;
        
        if (participantAmount <= 0) {
          stats.skipped++;
          continue;
        }
        
        stats.processed++;
        
        // Crear una asignación para este participante y gasto
        const newAllocation = new ParticipantAllocation({
          sessionId: monthlySession.parentSessionId, // Referencia a la sesión principal
          monthlySessionId: monthlySession._id, // Referencia a esta sesión mensual
          userId: participantId,
          name: participant.name,
          amount: participantAmount,
          currency: monthlySession.currency || 'EUR',
          percentage: percentage,
          status: 'pending',
          isRecurring: expense.isRecurring,
          expenseId: expense._id,
          yearMonth: monthlySession.yearMonth
        });
        
        await newAllocation.save({ session: dbSession });
        
        // Crear o actualizar el gasto personal correspondiente
        const personalExpenseData = {
          user: participantId,
          name: `${monthlySession.name}: ${expense.name || 'Gasto'}`,
          description: `Parte correspondiente (${percentage}%) de ${expense.description || 'gasto compartido'}`,
          amount: participantAmount,
          currency: monthlySession.currency || 'EUR',
          category: expense.category || 'Gastos Compartidos',
          date: expense.date, // Usar la fecha específica del gasto mensual
          type: 'expense',
          isRecurring: expense.isRecurring,
          allocationId: newAllocation._id,
          sessionReference: {
            sessionId: monthlySession.parentSessionId,
            monthlySessionId: monthlySession._id,
            sessionName: monthlySession.name,
            percentage: percentage,
            isRecurringShare: expense.isRecurring,
            yearMonth: monthlySession.yearMonth
          }
        };
        
        // Buscar si ya existe un gasto personal para esta asignación
        const existingExpense = await PersonalExpense.findOne({
          user: participantId,
          'sessionReference.monthlySessionId': monthlySession._id,
          'sessionReference.yearMonth': monthlySession.yearMonth,
          allocationId: newAllocation._id
        }, null, { session: dbSession });
        
        if (existingExpense) {
          // Actualizar el gasto existente
          Object.assign(existingExpense, personalExpenseData);
          await existingExpense.save({ session: dbSession });
          stats.updated++;
        } else {
          // Crear nuevo gasto personal
          const newExpense = new PersonalExpense(personalExpenseData);
          await newExpense.save({ session: dbSession });
          stats.created++;
          
          // Actualizar la referencia en la asignación
          newAllocation.personalExpenseId = newExpense._id;
          await newAllocation.save({ session: dbSession });
        }
      }
    }
    
    // Confirmar la transacción
    await dbSession.commitTransaction();
    
    console.log(`Sincronización completada para sesión mensual ${monthlySessionId}: ${stats.created} creados, ${stats.updated} actualizados`);
    return stats;
  } catch (error) {
    // Revertir en caso de error
    await dbSession.abortTransaction();
    console.error(`Error al sincronizar sesión mensual:`, error);
    throw error;
  } finally {
    dbSession.endSession();
  }
};

/**
 * Sincroniza todas las sesiones mensuales para un año y mes específicos
 * @param {Number} year - Año a sincronizar
 * @param {Number} month - Mes a sincronizar (1-12)
 * @returns {Object} Estadísticas de sincronización
 */
const syncAllMonthlySessionsForMonth = async (year, month) => {
  const totalStats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    sessions: 0
  };
  
  // Buscar todas las sesiones mensuales para este año/mes
  const monthlySessions = await MonthlySharedSession.find({
    year: year,
    month: month
  });
  
  console.log(`Encontradas ${monthlySessions.length} sesiones mensuales para ${month}/${year}`);
  
  // Procesar cada sesión
  for (const session of monthlySessions) {
    try {
      const stats = await syncMonthlySessionToPersonal(session._id);
      totalStats.processed += stats.processed;
      totalStats.created += stats.created;
      totalStats.updated += stats.updated;
      totalStats.skipped += stats.skipped;
      totalStats.sessions++;
    } catch (error) {
      console.error(`Error al sincronizar sesión ${session._id}:`, error);
      // Continuar con las demás sesiones
    }
  }
  
  return totalStats;
};

module.exports = {
  createMonthlyInstances,
  propagateExpenseToMonthlyInstances,
  syncMonthlySessionToPersonal,
  syncAllMonthlySessionsForMonth
}; 