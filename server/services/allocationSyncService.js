const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation } = require('../models');

class AllocationSyncService {
  /**
   * Sincroniza las asignaciones para un mes específico de una sesión
   * @param {string} sessionId - ID de la sesión
   * @param {number} year - Año
   * @param {number} month - Mes (0-11)
   * @param {mongoose.ClientSession} [dbSession] - Sesión de MongoDB opcional
   */
  async syncMonthlyAllocations(sessionId, year, month, dbSession = null) {
    console.log(`Iniciando sincMonthlyAllocations para sessionId=${sessionId}, año=${year}, mes=${month}`);
    
    // Validar parámetros
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }
    
    if (year === undefined || year === null || month === undefined || month === null) {
      throw new Error('Año y mes son requeridos');
    }
    
    try {
      // Convertir sessionId a string si es un ObjectId
      const sessionIdStr = sessionId.toString();
      
      // Buscar la sesión
      const session = await SharedSession.findById(sessionIdStr)
        .populate('participants.userId', 'nombre email');
      
      if (!session) {
        throw new Error(`Sesión no encontrada con ID: ${sessionIdStr}`);
      }
      
      console.log(`Sesión encontrada: ${session.name}, participantes: ${session.participants.length}`);
      
      // Verificar que los participantes existen
      if (!session.participants || !Array.isArray(session.participants) || session.participants.length === 0) {
        console.log(`La sesión ${sessionIdStr} no tiene participantes, saltando sincronización`);
        return;
      }
      
      // Calcular el total de gastos para el mes específico
      const monthlyExpenses = this._getMonthlyExpenses(session, year, month);
      const totalAmount = monthlyExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      console.log(`Sincronizando asignaciones para ${year}-${month+1}, total: ${totalAmount}`);
      console.log(`Gastos encontrados: ${monthlyExpenses.length}`);
      
      // Depurar información de los gastos
      if (monthlyExpenses.length > 0) {
        console.log('Detalle de gastos:');
        monthlyExpenses.forEach((exp, index) => {
          console.log(`  ${index+1}. ${exp.name}: ${exp.amount} EUR (${exp.date ? new Date(exp.date).toISOString().split('T')[0] : 'sin fecha'})`);
        });
      } else {
        console.log(`No hay gastos para sincronizar en ${year}-${month+1}, omitiendo`);
        return;
      }
      
      // Obtener los porcentajes de asignación de la sesión
      let allocations = session.allocations || [];
      
      console.log(`Verificando allocations en la sesión. Encontrados: ${allocations.length}`);
      if (allocations.length > 0) {
        allocations.forEach((alloc, idx) => {
          console.log(`Allocation ${idx+1}: userId=${alloc.userId}, name=${alloc.name}, percentage=${alloc.percentage}%`);
        });
      }
      
      // Si no hay asignaciones, crear una distribución equitativa
      if (allocations.length === 0) {
        console.log('No hay asignaciones definidas, creando distribución equitativa');
        
        // Filtrar participantes válidos (con userId)
        const validParticipants = session.participants.filter(p => p.userId);
        const participantCount = validParticipants.length;
        
        if (participantCount === 0) {
          console.log('No hay participantes válidos para asignar gastos');
          return;
        }
        
        const equalShare = Math.floor(100 / participantCount);
        let remainingPercentage = 100 - (equalShare * participantCount);
        
        // Crear asignaciones temporales para todos los participantes
        allocations = validParticipants.map((participant, index) => {
          const percentage = index === 0 ? equalShare + remainingPercentage : equalShare;
          
          console.log(`Creada asignación temporal para ${participant.name || participant.email}: ${percentage}%`);
          
          return {
            userId: participant.userId,
            name: participant.name || participant.email,
            percentage: percentage
          };
        });
      }
      
      // Validar que las asignaciones sumen 100%
      const totalPercentage = allocations.reduce((sum, alloc) => sum + (alloc.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.1) {
        console.warn(`Advertencia: Los porcentajes no suman 100% (total: ${totalPercentage}%). Ajustando...`);
        
        // Ajustar proporcionalmente
        const factor = 100 / totalPercentage;
        allocations = allocations.map(alloc => ({
          ...alloc,
          percentage: parseFloat((alloc.percentage * factor).toFixed(2))
        }));
        
        // Asegurar que la suma sea exactamente 100% después del redondeo
        const newTotal = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
        if (Math.abs(newTotal - 100) > 0.01 && allocations.length > 0) {
          const diff = 100 - newTotal;
          allocations[0].percentage = parseFloat((allocations[0].percentage + diff).toFixed(2));
        }
      }
      
      // Crear o actualizar asignaciones para cada participante
      const operations = [];
      
      // Usar un conjunto para evitar duplicados en las operaciones
      const processedUserIds = new Set();
      
      for (const participant of session.participants) {
        if (!participant.userId) {
          console.log(`Participante ${participant.name || participant.email} no tiene userId, omitiendo`);
          continue;
        }
        
        const userId = participant.userId.toString();
        
        // Evitar procesar el mismo usuario más de una vez
        if (processedUserIds.has(userId)) {
          console.log(`Usuario ${userId} ya procesado, omitiendo duplicado`);
          continue;
        }
        
        processedUserIds.add(userId);
        
        // Buscar la asignación para este participante
        const allocation = allocations.find(a => 
          a.userId && a.userId.toString() === userId
        );
        
        if (!allocation) {
          console.log(`No se encontró asignación para ${participant.name || participant.email} con ID ${userId}, creando asignación temporal con 50%`);
          // Crear una asignación temporal para este participante
          const tempAllocation = {
            userId: userId,
            name: participant.name || participant.email,
            percentage: 50  // Asignación por defecto del 50%
          };
          
          const participantAmount = parseFloat((totalAmount * 50 / 100).toFixed(2));
          
          operations.push(
            this._updateParticipantAllocation(
              session,
              participant,
              year,
              month,
              totalAmount,
              participantAmount,
              50, // 50%
              monthlyExpenses,
              dbSession
            ).catch(error => {
              console.error(`Error al actualizar asignación para ${participant.name}: ${error.message}`);
              return null; // Continuar con otros participantes
            })
          );
        } else {
          const percentage = allocation.percentage || 0;
          const participantAmount = parseFloat((totalAmount * percentage / 100).toFixed(2));
          
          console.log(`Procesando asignación para ${participant.name}: ${participantAmount} EUR (${percentage}%)`);
          
          operations.push(
            this._updateParticipantAllocation(
              session,
              participant,
              year,
              month,
              totalAmount,
              participantAmount,
              percentage,
              monthlyExpenses,
              dbSession
            ).catch(error => {
              console.error(`Error al actualizar asignación para ${participant.name}: ${error.message}`);
              return null; // Continuar con otros participantes
            })
          );
        }
      }
      
      // Ejecutar todas las operaciones
      const results = await Promise.all(operations);
      const successCount = results.filter(result => result !== null).length;
      
      console.log(`Asignaciones actualizadas para ${year}-${month+1}: ${successCount} de ${operations.length}`);
      
    } catch (error) {
      console.error(`Error en syncMonthlyAllocations: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }

  /**
   * Obtiene los gastos de un mes específico
   */
  _getMonthlyExpenses(session, year, month) {
    const yearData = session.yearlyExpenses.find(y => y.year === year);
    if (!yearData) {
      console.log(`No se encontró el año ${year} en la sesión`);
      return [];
    }
    
    const monthData = yearData.months.find(m => m.month === month);
    if (!monthData) {
      console.log(`No se encontró el mes ${month} en el año ${year}`);
      return [];
    }

    // Verificar que expenses sea un array no nulo
    if (!monthData.expenses || !Array.isArray(monthData.expenses)) {
      console.log(`El array de gastos para ${year}-${month+1} es nulo o no es un array`);
      return [];
    }

    return monthData.expenses;
  }

  /**
   * Actualiza o crea la asignación para un participante
   */
  async _updateParticipantAllocation(
    session,
    participant,
    year,
    month,
    totalAmount,
    participantAmount,
    percentage,
    monthlyExpenses,
    dbSession
  ) {
    try {
      // Verificar parámetros requeridos
      if (!session || !participant || !participant.userId) {
        throw new Error('Parámetros inválidos para actualizar asignación');
      }
      
      const userId = participant.userId.toString();
      const sessionId = session._id.toString();
      
      console.log(`Procesando asignación para ${participant.name || 'Participante'} (${userId}) en sesión ${sessionId}`);
      
      // Calcular el monto específico para cada gasto individual
      const expenseDetails = monthlyExpenses.map(exp => {
        try {
          // Calcular la parte proporcional de este gasto para este participante
          const expAmount = parseFloat((exp.amount * percentage / 100).toFixed(2));
          
          return {
            expenseId: exp._id,
            name: exp.name || 'Gasto',
            description: exp.description || '',
            amount: expAmount,
            percentage: percentage,
            date: exp.date || new Date(),
            category: exp.category || 'Otros',
            paidBy: exp.paidBy ? exp.paidBy.toString() : null
          };
        } catch (expError) {
          console.error(`Error procesando gasto individual:`, expError);
          // Retornar un objeto con datos mínimos en caso de error
          return {
            name: 'Gasto (error)',
            amount: 0,
            percentage: percentage
          };
        }
      }).filter(exp => exp !== null);
      
      console.log(`Asignando ${expenseDetails.length} gastos a ${participant.name || 'Participante'}`);
      
      // Preparar los datos de la asignación
      const allocationData = {
        sessionId: sessionId,
        userId: userId,
        username: participant.userId.nombre || participant.name || 'Usuario',
        name: participant.userId.nombre || participant.name || 'Usuario',
        amount: participantAmount,
        totalAmount,
        year,
        month,
        currency: session.currency || 'EUR',
        percentage,
        status: 'pending',
        expenses: expenseDetails,
        updatedAt: new Date()
      };
      
      // Verificar si ya existe una asignación para este usuario/sesión/año/mes
      const existingAllocation = await ParticipantAllocation.findOne({
        sessionId,
        userId,
        year,
        month
      });
      
      let result;
      
      if (existingAllocation) {
        console.log(`Actualizando asignación existente ${existingAllocation._id}`);
        
        // Actualizar la asignación existente
        result = await ParticipantAllocation.findByIdAndUpdate(
          existingAllocation._id,
          { $set: allocationData },
          { new: true }
        );
      } else {
        console.log(`Creando nueva asignación para ${participant.name || 'Participante'}`);
        
        // Crear una nueva asignación
        const newAllocation = new ParticipantAllocation(allocationData);
        
        // Validar el modelo antes de guardar
        const validationError = newAllocation.validateSync();
        if (validationError) {
          console.error('Error de validación:', validationError);
          throw new Error(`Error de validación: ${validationError.message}`);
        }
        
        // Guardar la nueva asignación
        result = await newAllocation.save();
      }
      
      console.log(`Asignación guardada: ${result._id}`);
      
      // Actualizar o crear el gasto personal correspondiente si hay un servicio de sincronización
      try {
        const syncService = require('./syncService');
        if (syncService && typeof syncService.processNewAllocation === 'function') {
          console.log(`Sincronizando asignación ${result._id} con gasto personal`);
          await syncService.processNewAllocation(result);
        }
      } catch (syncError) {
        console.error(`Error al sincronizar con gasto personal:`, syncError);
        // No interrumpir el flujo por error en sincronización
      }
      
      return result;
    } catch (error) {
      console.error(`Error en _updateParticipantAllocation:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza las asignaciones para un rango de meses
   */
  async syncDateRange(sessionId, startDate, endDate, dbSession = null) {
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 0;
      const monthEnd = year === endYear ? endMonth : 11;

      for (let month = monthStart; month <= monthEnd; month++) {
        await this.syncMonthlyAllocations(sessionId, year, month, dbSession);
      }
    }
  }

  /**
   * Recalcula y sincroniza todas las asignaciones de una sesión
   */
  async resyncEntireSession(sessionId, dbSession = null) {
    const session = await SharedSession.findById(sessionId);
    if (!session) throw new Error('Sesión no encontrada');

    // Obtener el rango de fechas de todos los gastos
    const dateRange = this._getSessionDateRange(session);
    if (!dateRange) return;

    await this.syncDateRange(
      sessionId,
      dateRange.startDate,
      dateRange.endDate,
      dbSession
    );
  }

  /**
   * Obtiene el rango de fechas de todos los gastos en una sesión
   */
  _getSessionDateRange(session) {
    let minDate = null;
    let maxDate = null;

    session.yearlyExpenses.forEach(yearData => {
      yearData.months.forEach(monthData => {
        monthData.expenses.forEach(expense => {
          const expenseDate = new Date(expense.date);
          if (!minDate || expenseDate < minDate) minDate = expenseDate;
          if (!maxDate || expenseDate > maxDate) maxDate = expenseDate;
        });
      });
    });

    if (!minDate || !maxDate) return null;

    return {
      startDate: minDate,
      endDate: maxDate
    };
  }
}

module.exports = new AllocationSyncService(); 