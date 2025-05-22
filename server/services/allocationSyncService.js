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
    const session = await SharedSession.findById(sessionId)
      .populate('participants.userId', 'nombre email');
    
    if (!session) throw new Error('Sesión no encontrada');

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
    }

    // Obtener los porcentajes de asignación de la sesión
    const allocations = session.allocations || [];
    
    console.log(`Verificando allocations en la sesión. Encontrados: ${allocations.length}`);
    if (allocations.length > 0) {
      allocations.forEach((alloc, idx) => {
        console.log(`Allocation ${idx+1}: userId=${alloc.userId}, name=${alloc.name}, percentage=${alloc.percentage}%`);
      });
    }
    
    if (allocations.length === 0) {
      console.log('No hay asignaciones definidas, creando distribución equitativa');
      const participantCount = session.participants.length;
      const equalShare = 100 / participantCount;
      
      // Crear asignaciones temporales para todos los participantes
      for (const participant of session.participants) {
        if (!participant.userId) {
          console.log(`Participante ${participant.name || participant.email} no tiene userId, omitiendo`);
          continue;
        }
        
        allocations.push({
          userId: participant.userId,
          name: participant.name || participant.email,
          percentage: equalShare
        });
        
        console.log(`Creada asignación temporal para ${participant.name || participant.email}: ${equalShare}%`);
      }
    }

    // Crear o actualizar asignaciones para cada participante
    const operations = [];
    
    for (const participant of session.participants) {
      if (!participant.userId) {
        console.log(`Participante ${participant.name || participant.email} no tiene userId, omitiendo`);
        continue;
      }

      // Buscar la asignación para este participante
      const allocation = allocations.find(a => 
        a.userId && a.userId.toString() === participant.userId.toString()
      );
      
      if (!allocation) {
        console.log(`No se encontró asignación para ${participant.name || participant.email} con ID ${participant.userId}, creando asignación temporal con 50%`);
        // Crear una asignación temporal para este participante
        const tempAllocation = {
          userId: participant.userId,
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
          )
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
          )
        );
      }
    }

    await Promise.all(operations);
    console.log(`Asignaciones actualizadas para ${year}-${month+1}`);
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
    // Calcular el monto específico para cada gasto individual
    const expenseDetails = monthlyExpenses.map(exp => {
      // Calcular la parte proporcional de este gasto para este participante
      const expAmount = parseFloat((exp.amount * percentage / 100).toFixed(2));
      
      return {
        expenseId: exp._id,
        name: exp.name,
        description: exp.description || '',
        amount: expAmount,
        percentage: percentage,
        date: exp.date,
        category: exp.category,
        paidBy: exp.paidBy
      };
    });

    console.log(`Asignando ${expenseDetails.length} gastos a ${participant.name}`);

    const allocationData = {
      sessionId: session._id,
      userId: participant.userId,
      username: participant.userId.nombre || participant.name,
      name: participant.userId.nombre || participant.name,
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

    const options = { 
      upsert: true, 
      new: true, 
      setDefaultsOnInsert: true 
    };
    
    if (dbSession) {
      options.session = dbSession;
    }

    try {
      // Buscar si ya existe una asignación para este participante en este mes/año
      const existingAllocation = await ParticipantAllocation.findOne({
        sessionId: session._id,
        userId: participant.userId,
        year,
        month
      });

      // Si existe, actualizar sus campos individualmente para mantener otras propiedades
      if (existingAllocation) {
        console.log(`Actualizando asignación existente ${existingAllocation._id} para ${participant.name}`);
        
        existingAllocation.amount = participantAmount;
        existingAllocation.totalAmount = totalAmount;
        existingAllocation.percentage = percentage;
        existingAllocation.expenses = expenseDetails;
        existingAllocation.updatedAt = new Date();
        
        await existingAllocation.save(dbSession ? { session: dbSession } : {});
        return existingAllocation;
      } else {
        // Si no existe, crear una nueva
        console.log(`Creando nueva asignación para ${participant.name}`);
        const newAllocation = new ParticipantAllocation(allocationData);
        await newAllocation.save(dbSession ? { session: dbSession } : {});
        return newAllocation;
      }
    } catch (error) {
      console.error(`Error al procesar asignación para ${participant.name}:`, error);
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