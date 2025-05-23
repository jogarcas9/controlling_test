const mongoose = require('mongoose');
const SharedSession = require('../models/SharedSession');

class MonthGenerationService {
  /**
   * Genera los próximos 12 meses a partir del mes actual para una sesión
   * @param {string} sessionId - ID de la sesión compartida
   * @param {mongoose.ClientSession} [dbSession] - Sesión de MongoDB opcional
   */
  static async generateNextTwelveMonths(sessionId, dbSession = null) {
    try {
      // Obtener la sesión
      const session = await SharedSession.findById(sessionId).session(dbSession);
      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      // Calcular porcentajes equitativos
      const totalParticipants = session.participants.length;
      const equalPercentage = parseFloat((100 / totalParticipants).toFixed(2));

      // Preparar la distribución base que se usará en cada mes
      const baseDistribution = session.participants.map((participant, index) => ({
        userId: participant.userId,
        name: participant.name || participant.email,
        percentage: index === totalParticipants - 1 
          ? parseFloat((100 - (equalPercentage * (totalParticipants - 1))).toFixed(2))
          : equalPercentage,
        _id: new mongoose.Types.ObjectId()
      }));

      // Crear la estructura base de yearlyExpenses
      const yearlyExpenses = [];
      let year = currentYear;
      let month = currentMonth;

      // Crear los próximos 12 meses
      for (let i = 0; i < 12; i++) {
        // Encontrar o crear el año actual
        let yearData = yearlyExpenses.find(y => y.year === year);
        if (!yearData) {
          yearData = {
            year,
            _id: new mongoose.Types.ObjectId(),
            months: []
          };
          yearlyExpenses.push(yearData);
        }

        // Crear el mes con la estructura exacta requerida
        const monthData = {
          _id: new mongoose.Types.ObjectId(),
          month,
          expenses: [],
          totalAmount: 0,
          Distribution: baseDistribution.map(dist => ({
            ...dist,
            _id: new mongoose.Types.ObjectId()
          }))
        };

        yearData.months.push(monthData);

        // Avanzar al siguiente mes
        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
      }

      // Ordenar meses y años
      for (const yearData of yearlyExpenses) {
        yearData.months.sort((a, b) => a.month - b.month);
      }
      yearlyExpenses.sort((a, b) => a.year - b.year);

      // Actualizar la sesión con la nueva estructura
      const result = await SharedSession.findByIdAndUpdate(
        sessionId,
        { 
          $set: { yearlyExpenses }
        },
        { 
          new: true,
          session: dbSession
        }
      );

      if (!result) {
        throw new Error('Error al actualizar la sesión');
      }

      return result;
    } catch (error) {
      console.error('[MonthGenerationService] Error:', error);
      throw error;
    }
  }

  /**
   * Obtiene los datos del mes anterior
   * @private
   */
  static getPreviousMonthData(session, targetYear, targetMonth) {
    let previousMonth = targetMonth - 1;
    let previousYear = targetYear;
    
    if (previousMonth < 0) {
      previousMonth = 11;
      previousYear--;
    }

    const yearData = session.yearlyExpenses.find(y => y.year === previousYear);
    if (!yearData) return null;

    return yearData.months.find(m => m.month === previousMonth);
  }

  /**
   * Verifica y genera el siguiente mes si es necesario
   * @param {string} sessionId - ID de la sesión compartida
   */
  static async checkAndGenerateNextMonth(sessionId) {
    const session = await SharedSession.findById(sessionId);
    if (!session) throw new Error('Sesión no encontrada');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Verificamos si necesitamos generar un nuevo mes
    const lastMonth = this.getLastGeneratedMonth(session);
    if (!lastMonth) {
      return await this.generateNextTwelveMonths(sessionId);
    }

    // Si el último mes generado es anterior al mes actual, generamos el siguiente
    if (lastMonth.year < currentYear || 
        (lastMonth.year === currentYear && lastMonth.month < currentMonth)) {
      
      const nextMonth = (lastMonth.month + 1) % 12;
      const nextYear = lastMonth.month === 11 ? lastMonth.year + 1 : lastMonth.year;

      // Buscamos o creamos el año
      let yearData = session.yearlyExpenses.find(y => y.year === nextYear);
      if (!yearData) {
        yearData = {
          year: nextYear,
          months: []
        };
        session.yearlyExpenses.push(yearData);
      }

      // Creamos el nuevo mes con las allocations del mes anterior
      const previousMonthData = this.getPreviousMonthData(session, nextYear, nextMonth);
      yearData.months.push({
        month: nextMonth,
        expenses: [],
        totalAmount: 0,
        Distribution: previousMonthData ? [...previousMonthData.Distribution] : [],
        isLocked: false,
        status: 'pending'
      });

      // Actualizamos los campos de control
      session.lastGeneratedYear = nextYear;
      session.lastGeneratedMonth = nextMonth;

      await session.save();
    }

    return session;
  }

  /**
   * Obtiene el último mes generado
   * @private
   */
  static getLastGeneratedMonth(session) {
    if (!session.yearlyExpenses.length) return null;

    let lastYear = null;
    let lastMonth = null;

    for (const yearData of session.yearlyExpenses) {
      if (!lastYear || yearData.year > lastYear.year) {
        lastYear = yearData;
      }
    }

    if (!lastYear || !lastYear.months.length) return null;

    for (const monthData of lastYear.months) {
      if (!lastMonth || monthData.month > lastMonth.month) {
        lastMonth = monthData;
      }
    }

    return {
      year: lastYear.year,
      month: lastMonth.month
    };
  }

  // Método para actualizar la distribución en todos los meses
  static async updateDistributionInAllMonths(sessionId, dbSession = null) {
    try {
      const session = await SharedSession.findById(sessionId).session(dbSession);
      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      // Calcular porcentajes equitativos
      const totalParticipants = session.participants.length;
      const equalPercentage = parseFloat((100 / totalParticipants).toFixed(2));

      // Preparar la nueva distribución
      const newDistribution = session.participants.map((participant, index) => ({
        userId: participant.userId,
        name: participant.name || participant.email,
        percentage: index === totalParticipants - 1 
          ? parseFloat((100 - (equalPercentage * (totalParticipants - 1))).toFixed(2))
          : equalPercentage,
        _id: new mongoose.Types.ObjectId()
      }));

      // Actualizar la distribución en todos los meses
      if (session.yearlyExpenses) {
        for (const yearData of session.yearlyExpenses) {
          if (yearData.months) {
            for (const monthData of yearData.months) {
              monthData.Distribution = newDistribution.map(dist => ({
                ...dist,
                _id: new mongoose.Types.ObjectId()
              }));
            }
          }
        }
      }

      // Guardar los cambios
      await session.save();
      return session;
    } catch (error) {
      console.error('[MonthGenerationService] Error al actualizar distribución:', error);
      throw error;
    }
  }
}

module.exports = MonthGenerationService; 