const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation } = require('../models');

// Sincronizar asignaciones mensuales
exports.syncMonthlyAllocations = async (sessionId, year, month, dbSession = null) => {
  const session = dbSession || await mongoose.startSession();
  let success = false;

  try {
    if (!dbSession) {
      session.startTransaction();
    }

    // Buscar la sesión
    const sharedSession = await SharedSession.findById(sessionId).session(session);
    if (!sharedSession) {
      throw new Error('Sesión no encontrada');
    }

    // Encontrar el año y mes específico
    const yearData = sharedSession.yearlyExpenses?.find(y => y.year === year);
    const monthData = yearData?.months?.find(m => m.month === month);

    if (!monthData) {
      throw new Error(`No se encontraron datos para el mes ${month + 1} del año ${year}`);
    }

    // Obtener la distribución del mes
    const distribution = monthData.Distribution || [];
    const totalAmount = monthData.totalAmount || 0;

    // Eliminar asignaciones existentes para este mes/año
    await ParticipantAllocation.deleteMany({
      sessionId,
      year,
      month
    }).session(session);

    // Crear nuevas asignaciones basadas en la distribución
    const allocations = [];
    for (const dist of distribution) {
      if (!dist.userId || !dist.percentage) continue;

      const amount = (totalAmount * dist.percentage) / 100;
      
      const allocation = new ParticipantAllocation({
        sessionId,
        userId: dist.userId,
        year,
        month,
        percentage: dist.percentage,
        amount,
        status: 'pending',
        name: dist.name || 'Usuario'
      });

      allocations.push(allocation);
    }

    // Guardar las nuevas asignaciones
    if (allocations.length > 0) {
      await ParticipantAllocation.insertMany(allocations, { session });
    }

    if (!dbSession) {
      await session.commitTransaction();
    }
    success = true;

    return allocations;
  } catch (error) {
    if (!dbSession) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (!dbSession) {
      session.endSession();
    }
  }
};

// Sincronizar todas las asignaciones de una sesión
exports.syncAllMonthlyAllocations = async (sessionId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sharedSession = await SharedSession.findById(sessionId).session(session);
    if (!sharedSession) {
      throw new Error('Sesión no encontrada');
    }

    const results = {
      processed: 0,
      created: 0,
      errors: 0
    };

    // Procesar cada año y mes
    for (const yearData of sharedSession.yearlyExpenses || []) {
      const year = yearData.year;

      for (const monthData of yearData.months || []) {
        const month = monthData.month;
        results.processed++;

        try {
          const allocations = await exports.syncMonthlyAllocations(sessionId, year, month, session);
          results.created += allocations.length;
        } catch (error) {
          console.error(`Error al sincronizar ${year}-${month+1}:`, error);
          results.errors++;
        }
      }
    }

    await session.commitTransaction();
    return results;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Actualizar nombres de usuario en asignaciones
exports.updateUserNamesInAllocations = async (sessionId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sharedSession = await SharedSession.findById(sessionId).session(session);
    if (!sharedSession) {
      throw new Error('Sesión no encontrada');
    }

    // Actualizar nombres en asignaciones existentes
    const allocations = await ParticipantAllocation.find({ sessionId }).session(session);
    
    for (const allocation of allocations) {
      const distribution = sharedSession.yearlyExpenses
        ?.find(y => y.year === allocation.year)
        ?.months?.find(m => m.month === allocation.month)
        ?.Distribution?.find(d => d.userId.toString() === allocation.userId.toString());

      if (distribution && distribution.name !== allocation.name) {
        allocation.name = distribution.name;
        await allocation.save({ session });
      }
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Función auxiliar para obtener el nombre del mes
function getMonthName(monthIndex) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return monthNames[monthIndex] || 'Mes inválido';
} 