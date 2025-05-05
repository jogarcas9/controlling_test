const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation } = require('../models');
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
  const { _id: sessionId, totalAmount, currency = 'EUR', allocations } = session;
  
  // Validaciones
  if (!sessionId) {
    throw new Error('ID de sesión no válido');
  }
  
  if (!totalAmount || totalAmount <= 0) {
    throw new Error('El monto total debe ser mayor que cero');
  }
  
  validatePercentages(allocations);
  
  console.log(`Iniciando distribución de montos para sesión ${sessionId}, total: ${totalAmount} ${currency}`);
  
  // Iniciar transacción de MongoDB
  const session_db = await mongoose.startSession();
  session_db.startTransaction();
  
  try {
    // Primero eliminar asignaciones existentes para esta sesión
    await ParticipantAllocation.deleteMany({ sessionId }, { session: session_db });
    
    // Crear asignaciones para cada participante
    const allocationsToInsert = allocations.map(participant => {
      // Calcular monto asignado con 2 decimales
      const amount = parseFloat((totalAmount * (participant.percentage / 100)).toFixed(2));
      
      return {
        sessionId,
        userId: participant.userId,
        name: participant.name || 'Participante',
        amount,
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
    
    console.log(`Asignaciones creadas correctamente. Iniciando sincronización con gastos personales...`);
    
    // Sincronizar las asignaciones con gastos personales
    // Esto se hace fuera de la transacción para no bloquear la respuesta principal
    const syncResults = [];
    for (const allocation of createdAllocations) {
      try {
        const result = await syncService.processNewAllocation(allocation);
        syncResults.push({
          allocationId: allocation._id,
          userId: allocation.userId,
          success: true,
          personalExpenseId: result.personalExpense?._id
        });
      } catch (error) {
        console.error(`Error al sincronizar asignación ${allocation._id}:`, error);
        syncResults.push({
          allocationId: allocation._id,
          userId: allocation.userId,
          success: false,
          error: error.message
        });
        // No interrumpimos el flujo principal si falla la sincronización
      }
    }
    
    console.log(`Resultados de sincronización:`, JSON.stringify(syncResults));
    
    return createdAllocations;
  } catch (error) {
    // Revertir transacción en caso de error
    await session_db.abortTransaction();
    session_db.endSession();
    console.error(`Error en distributeAmount:`, error);
    throw error;
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

module.exports = {
  distributeAmount,
  updateAllocations,
  getUserAllocations,
  getSessionAllocations,
  updateAllocationStatus,
  updateAllocation,
  validatePercentages
}; 