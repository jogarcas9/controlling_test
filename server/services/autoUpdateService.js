const mongoose = require('mongoose');
const { SharedSession, ParticipantAllocation, User } = require('../models');
const allocationSyncService = require('./allocationSyncService');

class AutoUpdateService {
  /**
   * Verifica y crea nuevos meses para todas las sesiones activas
   * @returns {Promise<{ processed: number, updated: number }>}
   */
  async checkAndCreateNewMonths() {
    console.log('Iniciando verificación de meses futuros para todas las sesiones...');
    const stats = {
      processed: 0,
      updated: 0
    };

    try {
      // Obtener todas las sesiones activas
      const sessions = await SharedSession.find({ 
        isActive: true,
        sessionType: 'permanent'
      }).select('_id participants allocations yearlyExpenses currency isActive');

      console.log(`Encontradas ${sessions.length} sesiones activas para procesar`);

      // Obtener fecha actual y calcular límites
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const maxFutureMonths = 6; // Reducido a 6 meses en el futuro

      for (const session of sessions) {
        stats.processed++;
        
        const dbSession = await mongoose.startSession();
        await dbSession.withTransaction(async () => {
          try {
            // Verificar el último mes existente
            const lastMonthData = await this.getLastExistingMonth(session);
            let { year: lastYear, month: lastMonth } = lastMonthData;

            // Si no hay datos, empezar desde el mes actual
            if (lastMonth === -1) {
              lastYear = currentYear;
              lastMonth = currentMonth - 1;
            }

            // Calcular cuántos meses necesitamos añadir (máximo 6 meses)
            let monthsToAdd = [];
            let tempYear = lastYear;
            let tempMonth = lastMonth + 1;
            let monthCount = 0;

            while (monthCount < maxFutureMonths) {
              if (tempMonth > 11) {
                tempYear++;
                tempMonth = 0;
              }
              monthsToAdd.push({ year: tempYear, month: tempMonth });
              tempMonth++;
              monthCount++;
            }

            // Procesar los meses en lotes
            for (const { year, month } of monthsToAdd) {
              const yearData = await this.getOrCreateYearData(session, year);
              if (!yearData.months.some(m => m.month === month)) {
                await this.createMonthData(session, yearData, year, month, dbSession);
                stats.updated++;
              }
            }

            await session.save({ session: dbSession });
          } catch (error) {
            console.error(`Error procesando sesión ${session._id}:`, error);
            throw error;
          }
        });
      }

      console.log(`Proceso completado. Procesadas: ${stats.processed}, Actualizadas: ${stats.updated}`);
      return stats;

    } catch (error) {
      console.error('Error en checkAndCreateNewMonths:', error);
      throw error;
    }
  }

  /**
   * Obtiene el último mes existente en la sesión
   */
  getLastExistingMonth(session) {
    let lastYear = -1;
    let lastMonth = -1;

    if (session.yearlyExpenses && session.yearlyExpenses.length > 0) {
      const sortedYears = session.yearlyExpenses.sort((a, b) => b.year - a.year);
      const lastYearData = sortedYears[0];
      
      if (lastYearData.months && lastYearData.months.length > 0) {
        const sortedMonths = lastYearData.months.sort((a, b) => b.month - a.month);
        lastYear = lastYearData.year;
        lastMonth = sortedMonths[0].month;
      }
    }

    return { year: lastYear, month: lastMonth };
  }

  /**
   * Obtiene o crea los datos del año
   */
  async getOrCreateYearData(session, year) {
    let yearData = session.yearlyExpenses.find(y => y.year === year);
    if (!yearData) {
      yearData = {
        year,
        months: []
      };
      session.yearlyExpenses.push(yearData);
    }
    return yearData;
  }

  /**
   * Crea los datos del mes y sus asignaciones
   */
  async createMonthData(session, yearData, year, month, dbSession) {
    // Crear datos del mes
    const monthData = {
      month,
      expenses: [],
      totalAmount: 0
    };
    yearData.months.push(monthData);

    // Crear asignaciones para cada participante
    const userPromises = session.participants.map(participant => {
      if (!participant.userId) return null;
      return User.findById(participant.userId).select('nombre name username').lean();
    });

    const users = await Promise.all(userPromises);

    const allocationPromises = session.participants.map(async (participant, index) => {
      if (!participant.userId) return;

      const user = users[index];
      if (!user) return;

      const userName = user.nombre || user.name || user.username;
      const participantAllocation = session.allocations.find(a => 
        a.userId && a.userId.toString() === participant.userId.toString()
      );
      const percentage = participantAllocation?.percentage || 50;

      const allocation = new ParticipantAllocation({
        sessionId: session._id,
        userId: participant.userId,
        username: userName,
        name: userName,
        amount: 0,
        totalAmount: 0,
        year,
        month,
        currency: session.currency || 'EUR',
        percentage,
        status: 'pending'
      });

      return allocation.save({ session: dbSession });
    });

    await Promise.all(allocationPromises);

    // Copiar gastos recurrentes si existen
    await this.copyRecurringExpenses(session, year, month, dbSession);
  }

  /**
   * Copia los gastos recurrentes del mes anterior
   */
  async copyRecurringExpenses(session, year, month, dbSession) {
    const previousMonth = month === 0 ? 11 : month - 1;
    const previousYear = month === 0 ? year - 1 : year;
    
    const previousYearData = session.yearlyExpenses.find(y => y.year === previousYear);
    if (!previousYearData) return;

    const previousMonthData = previousYearData.months.find(m => m.month === previousMonth);
    if (!previousMonthData) return;

    const recurringExpenses = previousMonthData.expenses.filter(exp => exp.isRecurring);
    if (recurringExpenses.length === 0) return;

    const currentMonthData = session.yearlyExpenses
      .find(y => y.year === year)
      ?.months.find(m => m.month === month);
    
    if (!currentMonthData) return;

    for (const expense of recurringExpenses) {
      const newExpense = {
        ...expense,
        date: new Date(year, month, new Date(expense.date).getDate()),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      currentMonthData.expenses.push(newExpense);
      currentMonthData.totalAmount += expense.amount || 0;
    }

    // Actualizar las asignaciones con los nuevos montos
    await this.updateAllocationsForMonth(session, year, month, dbSession);
  }

  /**
   * Actualiza las asignaciones existentes para un mes específico
   */
  async updateAllocationsForMonth(session, year, month, dbSession) {
    try {
      const yearData = session.yearlyExpenses.find(y => y.year === year);
      if (!yearData) return;

      const monthData = yearData.months.find(m => m.month === month);
      if (!monthData) return;

      const totalAmount = monthData.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      const updatePromises = session.participants.map(async participant => {
        if (!participant.userId) return;

        const participantAllocation = session.allocations.find(a => 
          a.userId && a.userId.toString() === participant.userId.toString()
        );
        const percentage = participantAllocation?.percentage || 50;
        const amount = (totalAmount * percentage) / 100;

        return ParticipantAllocation.findOneAndUpdate(
          {
            sessionId: session._id,
            userId: participant.userId,
            year,
            month
          },
          {
            amount,
            totalAmount
          },
          { session: dbSession }
        );
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error(`Error actualizando asignaciones para ${year}-${month}:`, error);
      throw error;
    }
  }
}

module.exports = new AutoUpdateService(); 