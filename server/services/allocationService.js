const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation, PersonalExpense } = require('../models');
const syncService = require('./syncService');

/**
 * Valida que la suma de los porcentajes sea exactamente 100%
 * @param {Array} allocations - Lista de asignaciones de porcentajes
 * @throws {Error} Si la suma no es 100%
 */
const validatePercentages = (allocations) => {
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    throw new Error('La lista de asignaciones no puede estar vacía');
  }

  // Validar que no haya valores negativos o nulos
  const hasInvalidPercentage = allocations.some(
    alloc => alloc.percentage === undefined || alloc.percentage === null || alloc.percentage < 0
  );
  
  if (hasInvalidPercentage) {
    throw new Error('Todos los porcentajes deben ser valores positivos');
  }
  
  // Calcular suma total de porcentajes
  const sumPercentages = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
  
  // Permitir una pequeña tolerancia debido a errores de redondeo (0.01%)
  if (Math.abs(sumPercentages - 100) > 0.01) {
    throw new Error(`La suma de porcentajes debe ser 100%. Actual: ${sumPercentages.toFixed(2)}%`);
  }
};

/**
 * Distribuye el monto total entre los participantes según sus porcentajes
 * @param {Object} session - Sesión compartida con totalAmount y allocations
 * @returns {Array} Lista de asignaciones creadas
 */
const distributeAmount = async (session) => {
  // Verificar que la sesión existe y tiene el formato correcto
  if (!session || !session._id) {
    throw new Error('Sesión no proporcionada o inválida');
  }

  // Obtener datos necesarios de la sesión
  const sessionId = session._id.toString();
  const allocations = session.allocations || [];
  
  try {
    // Buscar el último mes con datos en yearlyExpenses
    let lastYear = 0;
    let lastMonth = 0;
    
    if (session.yearlyExpenses && Array.isArray(session.yearlyExpenses)) {
      session.yearlyExpenses.forEach(yearData => {
        if (yearData.year > lastYear) {
          lastYear = yearData.year;
          if (yearData.months && Array.isArray(yearData.months)) {
            yearData.months.forEach(monthData => {
              if (monthData.month > lastMonth) {
                lastMonth = monthData.month;
              }
            });
          }
        }
      });
    }
    
    // Si no hay datos en yearlyExpenses, usar la fecha actual
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    lastYear = lastYear || currentYear;
    lastMonth = lastMonth || currentMonth;
    
    // Validar las asignaciones
    if (!Array.isArray(allocations) || allocations.length === 0) {
      throw new Error('No hay asignaciones definidas para esta sesión');
    }

    // Validar que cada asignación tenga los campos necesarios
    for (const alloc of allocations) {
      if (!alloc.userId || typeof alloc.percentage !== 'number') {
        throw new Error('Asignación inválida: falta userId o percentage');
      }
    }

    validatePercentages(allocations);

    // Iniciar transacción de MongoDB
    const session_db = await mongoose.startSession();
    session_db.startTransaction();

    try {
      // Eliminar solo las asignaciones del mes actual y futuros
      await ParticipantAllocation.deleteMany({
        sessionId,
        $or: [
          { year: { $gt: currentYear } },
          { year: currentYear, month: { $gte: currentMonth } }
        ]
      }, { session: session_db });

      // Crear nuevas asignaciones para cada mes hasta el último mes con datos
      const allocationsToInsert = [];
      
      // Calcular cuántos meses procesar
      const totalMonths = ((lastYear - currentYear) * 12) + (lastMonth - currentMonth) + 1;
      
      console.log(`Procesando asignaciones desde ${currentYear}-${currentMonth+1} hasta ${lastYear}-${lastMonth+1} (${totalMonths} meses)`);

      for (let monthOffset = 0; monthOffset < totalMonths; monthOffset++) {
        const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);
        const targetMonth = (currentMonth + monthOffset) % 12;

        // Buscar el monto total para el mes objetivo
        let monthTotalAmount = 0;
        const yearData = session.yearlyExpenses?.find(y => y.year === targetYear);
        if (yearData) {
          const monthData = yearData.months?.find(m => m.month === targetMonth);
          if (monthData) {
            monthTotalAmount = monthData.totalAmount || 0;
            console.log(`Monto total encontrado para ${targetYear}-${targetMonth+1}: ${monthTotalAmount}`);
          }
        }

        // Si no hay monto específico para el mes, usar el monto total de la sesión
        if (monthTotalAmount <= 0 && session.totalAmount) {
          monthTotalAmount = session.totalAmount;
          console.log(`Usando monto total de la sesión: ${monthTotalAmount}`);
        }

        // Solo crear asignaciones si hay un monto total mayor que 0
        if (monthTotalAmount > 0) {
          for (const participant of allocations) {
            const userId = participant.userId.toString();
            const amount = parseFloat((monthTotalAmount * (participant.percentage / 100)).toFixed(2));

            allocationsToInsert.push({
              sessionId,
              userId,
              username: participant.name || 'Usuario',
              name: participant.name || 'Usuario',
              amount,
              totalAmount: monthTotalAmount,
              currency: session.currency || 'EUR',
              percentage: participant.percentage,
              status: 'pending',
              year: targetYear,
              month: targetMonth,
              updatedAt: new Date()
            });
          }
        }
      }

      // Verificar y ajustar diferencias por redondeo para cada mes
      const monthlyGroups = {};
      allocationsToInsert.forEach(alloc => {
        const key = `${alloc.year}-${alloc.month}`;
        if (!monthlyGroups[key]) {
          monthlyGroups[key] = [];
        }
        monthlyGroups[key].push(alloc);
      });

      Object.values(monthlyGroups).forEach(monthAllocations => {
        const monthTotalAmount = monthAllocations[0].totalAmount;
        const totalAllocated = monthAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
        if (Math.abs(totalAllocated - monthTotalAmount) > 0.01 && monthAllocations.length > 0) {
          const diff = monthTotalAmount - totalAllocated;
          monthAllocations[0].amount = parseFloat((monthAllocations[0].amount + diff).toFixed(2));
        }
      });

      // Insertar las nuevas asignaciones
      if (allocationsToInsert.length > 0) {
        console.log(`Insertando ${allocationsToInsert.length} asignaciones`);
        const createdAllocations = await ParticipantAllocation.insertMany(allocationsToInsert, { session: session_db });

        // Confirmar transacción
        await session_db.commitTransaction();
        session_db.endSession();

        // Sincronizar con gastos personales en segundo plano
        process.nextTick(async () => {
          try {
            const syncService = require('./syncService');
            for (const allocation of createdAllocations) {
              if (syncService && typeof syncService.processNewAllocation === 'function') {
                await syncService.processNewAllocation(allocation);
              }
            }
          } catch (syncError) {
            console.error('Error en sincronización de gastos personales:', syncError);
          }
        });

        return createdAllocations;
      }

      await session_db.commitTransaction();
      session_db.endSession();
      return [];
    } catch (error) {
      await session_db.abortTransaction();
      session_db.endSession();
      throw error;
    }
  } catch (error) {
    throw new Error(`Error al distribuir montos: ${error.message}`);
  }
};

/**
 * Actualiza las asignaciones cuando cambia el monto total o los porcentajes
 * @param {string} sessionId - ID de la sesión compartida
 * @param {number} newTotalAmount - Nuevo monto total
 * @param {Array} newAllocations - Nueva lista de asignaciones 
 * @returns {Array} Lista de asignaciones actualizadas
 */
const updateAllocations = async (sessionId, newTotalAmount, newAllocations) => {
  // Obtener la sesión para tener datos consistentes
  const session = await SharedSession.findById(sessionId);
  if (!session) {
    throw new Error('Sesión no encontrada');
  }
  
  // Actualizar el totalAmount de la sesión si es diferente
  if (newTotalAmount !== undefined && newTotalAmount !== session.totalAmount) {
    session.totalAmount = newTotalAmount;
  }
  
  // Actualizar las asignaciones si son diferentes
  if (newAllocations && Array.isArray(newAllocations)) {
    session.allocations = newAllocations;
  }
  
  // Guardar la sesión actualizada
  await session.save();
  
  // Redistribuir los montos
  return distributeAmount(session);
};

/**
 * Obtiene las asignaciones de un participante
 * @param {string} userId - ID del usuario participante
 * @param {string} status - Estado de las asignaciones (opcional)
 * @returns {Array} Lista de asignaciones del participante
 */
const getUserAllocations = async (userId, status) => {
  const query = { userId };
  
  if (status) {
    query.status = status;
  }
  
  return ParticipantAllocation.find(query)
    .populate('sessionId', 'name description sessionType')
    .sort({ createdAt: -1 });
};

/**
 * Obtiene las asignaciones de una sesión
 * @param {string} sessionId - ID de la sesión
 * @returns {Array} Lista de asignaciones de la sesión
 */
const getSessionAllocations = async (sessionId) => {
  return ParticipantAllocation.find({ sessionId })
    .populate('userId', 'nombre email')
    .sort({ percentage: -1 });
};

/**
 * Actualiza el estado de una asignación
 * @param {string} allocationId - ID de la asignación
 * @param {string} newStatus - Nuevo estado ('pending', 'accepted', 'paid')
 * @returns {Object} Asignación actualizada
 */
const updateAllocationStatus = async (allocationId, newStatus) => {
  if (!['pending', 'accepted', 'paid'].includes(newStatus)) {
    throw new Error('Estado no válido');
  }
  
  const updatedAllocation = await ParticipantAllocation.findByIdAndUpdate(
    allocationId,
    { status: newStatus, updatedAt: new Date() },
    { new: true }
  );
  
  // Sincronizar con gasto personal si se marca como aceptado o pagado
  if (updatedAllocation && ['accepted', 'paid'].includes(newStatus)) {
    try {
      await syncService.processUpdatedAllocation(updatedAllocation);
    } catch (error) {
      console.error(`Error al sincronizar actualización de asignación ${allocationId}:`, error);
      // No interrumpimos el flujo principal si falla la sincronización
    }
  }
  
  return updatedAllocation;
};

/**
 * Actualiza una asignación específica
 * @param {string} allocationId - ID de la asignación
 * @param {Object} updateData - Datos para actualizar
 * @returns {Object} Asignación actualizada
 */
const updateAllocation = async (allocationId, updateData) => {
  // No permitir actualizar campos críticos como sessionId o userId
  const safeUpdateData = { ...updateData };
  delete safeUpdateData.sessionId;
  delete safeUpdateData.userId;
  delete safeUpdateData.personalExpenseId;
  
  const updatedAllocation = await ParticipantAllocation.findByIdAndUpdate(
    allocationId,
    { ...safeUpdateData, updatedAt: new Date() },
    { new: true }
  );
  
  if (!updatedAllocation) {
    throw new Error('Asignación no encontrada');
  }
  
  // Sincronizar con gasto personal
  try {
    await syncService.processUpdatedAllocation(updatedAllocation);
  } catch (error) {
    console.error(`Error al sincronizar actualización de asignación ${allocationId}:`, error);
    // No interrumpimos el flujo principal si falla la sincronización
  }
  
  return updatedAllocation;
};

/**
 * Genera asignaciones de participantes para una sesión compartida por año/mes
 * @param {Object} session - Sesión compartida
 * @param {Number} year - Año
 * @param {Number} month - Mes (0-11)
 * @returns {Array} Lista de asignaciones creadas
 */
const generateMonthlyAllocations = async (session, year, month) => {
  const { _id: sessionId, allocations, currency = 'EUR', yearlyExpenses } = session;
  
  // Validaciones
  if (!sessionId) {
    throw new Error('ID de sesión no válido');
  }
  
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    throw new Error('No hay asignaciones de porcentajes definidas');
  }
  
  validatePercentages(allocations);
  
  // Buscar el monto total para el año/mes
  const yearData = yearlyExpenses.find(y => y.year === year);
  if (!yearData) {
    throw new Error(`No hay datos para el año ${year}`);
  }
  
  const monthData = yearData.months.find(m => m.month === month);
  if (!monthData) {
    throw new Error(`No hay datos para el mes ${month} del año ${year}`);
  }
  
  const totalAmount = monthData.totalAmount;
  if (!totalAmount || totalAmount <= 0) {
    throw new Error(`El monto total para ${year}-${month+1} debe ser mayor que cero`);
  }
  
  console.log(`Generando asignaciones para sesión ${sessionId}, año ${year}, mes ${month}, total: ${totalAmount} ${currency}`);
  
  // Iniciar transacción de MongoDB
  const session_db = await mongoose.startSession();
  session_db.startTransaction();
  
  try {
    // Primero eliminar asignaciones existentes para esta combinación
    await ParticipantAllocation.deleteMany({ 
      sessionId, 
      year, 
      month 
    }, { session: session_db });
    
    // Crear asignaciones para cada participante
    const allocationsToInsert = allocations.map(participant => {
      // Calcular monto asignado con 2 decimales
      const amount = parseFloat((totalAmount * (participant.percentage / 100)).toFixed(2));
      
      return {
        sessionId,
        userId: participant.userId,
        username: participant.name || 'Usuario',
        year,
        month,
        amount,
        totalAmount,
        currency,
        percentage: participant.percentage,
        status: 'pending'
      };
    });
    
    // Verificar suma total después del redondeo
    const totalAllocated = allocationsToInsert.reduce((sum, alloc) => sum + alloc.amount, 0);
    
    // Ajustar por diferencias de redondeo (asignar a primer participante)
    if (Math.abs(totalAllocated - totalAmount) > 0.01 && allocationsToInsert.length > 0) {
      const diff = totalAmount - totalAllocated;
      allocationsToInsert[0].amount = parseFloat((allocationsToInsert[0].amount + diff).toFixed(2));
      console.log(`Ajuste por redondeo: ${diff.toFixed(2)} ${currency} asignado al primer participante`);
    }
    
    console.log(`Insertando ${allocationsToInsert.length} asignaciones`);
    
    // Insertar las asignaciones en la base de datos
    const createdAllocations = await ParticipantAllocation.insertMany(allocationsToInsert, { session: session_db });
    
    // Confirmar transacción
    await session_db.commitTransaction();
    session_db.endSession();
    
    console.log(`Asignaciones mensuales creadas correctamente. Sincronizando con gastos personales...`);
    
    // Sincronizar con gastos personales
    const syncResults = [];
    for (const allocation of createdAllocations) {
      try {
        // Verificar si ya existe un gasto personal para esta asignación
        const existingExpense = await PersonalExpense.findOne({
          user: allocation.userId.toString(),
          'sessionReference.sessionId': sessionId,
          'sessionReference.year': year,
          'sessionReference.month': month
        });
        
        if (existingExpense) {
          // Actualizar el gasto existente
          existingExpense.amount = allocation.amount;
          existingExpense.allocationId = allocation._id;
          existingExpense.date = new Date(year, month, 15); // Fecha en el medio del mes
          await existingExpense.save();
          
          // Actualizar el ID del gasto personal en la asignación
          await ParticipantAllocation.findByIdAndUpdate(
            allocation._id,
            { personalExpenseId: existingExpense._id }
          );
          
          syncResults.push({
            allocationId: allocation._id,
            userId: allocation.userId,
            success: true,
            action: 'updated',
            personalExpenseId: existingExpense._id
          });
          
          console.log(`Actualizado gasto personal existente ${existingExpense._id} para la asignación ${allocation._id}`);
        } else {
          // Crear un nuevo gasto personal
          // Obtener el nombre de la sesión
          const sessionName = session.name || 'Gastos compartidos';
          
          const date = new Date(year, month, 15); // Día 15 del mes
          
          // Crear el gasto personal
          const newExpense = new PersonalExpense({
            user: allocation.userId.toString(),
            name: sessionName,
            description: `Gastos compartidos: ${sessionName} (${allocation.percentage}%)`,
            amount: allocation.amount,
            currency: allocation.currency || 'EUR',
            category: 'Gastos Compartidos',
            date: date,
            type: 'expense',
            allocationId: allocation._id,
            sessionReference: {
              sessionId: allocation.sessionId,
              sessionName: sessionName,
              percentage: allocation.percentage,
              year: year,
              month: month,
              isRecurringShare: session.sessionType === 'permanent'
            }
          });
          
          await newExpense.save();
          
          // Actualizar la asignación con el ID del gasto personal
          await ParticipantAllocation.findByIdAndUpdate(
            allocation._id,
            { personalExpenseId: newExpense._id }
          );
          
          syncResults.push({
            allocationId: allocation._id,
            userId: allocation.userId,
            success: true,
            action: 'created',
            personalExpenseId: newExpense._id
          });
          
          console.log(`Creado nuevo gasto personal ${newExpense._id} para la asignación ${allocation._id}`);
        }
      } catch (error) {
        console.error(`Error al sincronizar asignación ${allocation._id}:`, error);
        syncResults.push({
          allocationId: allocation._id,
          userId: allocation.userId,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`Resultados de sincronización:`, JSON.stringify(syncResults));
    
    return createdAllocations;
  } catch (error) {
    // Revertir transacción en caso de error
    await session_db.abortTransaction();
    session_db.endSession();
    console.error(`Error en generateMonthlyAllocations:`, error);
    throw error;
  }
};

module.exports = {
  validatePercentages,
  distributeAmount,
  updateAllocations,
  getUserAllocations,
  getSessionAllocations,
  updateAllocationStatus,
  updateAllocation,
  generateMonthlyAllocations
}; 