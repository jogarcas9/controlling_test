const mongoose = require('mongoose');
const PersonalExpense = require('../models/PersonalExpense');
const SharedExpense = require('../models/SharedExpense');

const syncPersonalExpenses = async (sharedExpense, session, mongoSession = null) => {
  try {
    console.log('[DEBUG] Iniciando sincronización de gastos personales');
    console.log('[DEBUG] Gasto compartido:', sharedExpense._id);
    console.log('[DEBUG] Sesión:', session._id);

    // Obtener el mes y año del gasto actual
    const expenseDate = new Date(sharedExpense.date);
    const month = expenseDate.getMonth();
    const year = expenseDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Obtener todos los gastos compartidos del mes para esta sesión
    const monthlyExpenses = await SharedExpense.find({
      session: session._id,
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    });

    // Calcular el total mensual
    const monthlyTotal = monthlyExpenses.reduce((total, expense) => {
      return total + (expense.distribute ? expense.amount : 0);
    }, 0);

    console.log(`[DEBUG] Total mensual para ${month + 1}/${year}: ${monthlyTotal}`);

    // Obtener la distribución de la sesión
    if (!session.allocation || session.allocation.length === 0) {
      console.log('[DEBUG] No hay asignación en la sesión, creando distribución equitativa');
      const participantCount = session.participants.length + 1; // +1 por el creador
      const equalPercentage = 100 / participantCount;
      
      session.allocation = [
        {
          userId: session.userId, // Usar userId para el creador
          percentage: equalPercentage
        },
        ...session.participants
          .filter(p => p.userId)
          .map(participant => ({
            userId: participant.userId,
            percentage: equalPercentage
          }))
      ];
    }

    // Procesar cada participante
    for (const allocation of session.allocation) {
      if (!allocation.userId) {
        console.log('[WARN] Participante sin userId en allocation, saltando...');
        continue;
      }

      const percentage = allocation.percentage || 0;
      const amount = (monthlyTotal * percentage) / 100;

      console.log(`[DEBUG] Calculado monto para usuario ${allocation.userId}:`);
      console.log(`- Porcentaje: ${percentage}%`);
      console.log(`- Monto: ${amount}`);

      // Buscar si ya existe un gasto personal para este mes
      const existingPersonalExpense = await PersonalExpense.findOne({
        user: allocation.userId,
        'sessionReference.sessionId': session._id,
        date: {
          $gte: firstDayOfMonth,
          $lte: lastDayOfMonth
        }
      });

      if (existingPersonalExpense) {
        console.log(`[DEBUG] Actualizando gasto personal existente: ${existingPersonalExpense._id}`);
        existingPersonalExpense.amount = amount;
        existingPersonalExpense.name = sharedExpense.name || 'Gasto compartido';
        existingPersonalExpense.description = `Total gastos compartidos de ${session.name} - ${month + 1}/${year}`;
        existingPersonalExpense.sessionReference = {
          sessionId: session._id,
          sessionName: session.name,
          percentage: percentage,
          month: month,
          year: year,
          isRecurringShare: session.sessionType === 'permanent'
        };

        if (mongoSession) {
          await existingPersonalExpense.save({ session: mongoSession });
        } else {
          await existingPersonalExpense.save();
        }
      } else if (amount > 0) {
        console.log(`[DEBUG] Creando nuevo gasto personal para usuario: ${allocation.userId}`);
        const newPersonalExpense = new PersonalExpense({
          user: allocation.userId,
          name: sharedExpense.name || 'Gasto compartido',
          amount: amount,
          category: 'Gastos compartidos',
          description: `Total gastos compartidos de ${session.name} - ${month + 1}/${year}`,
          date: new Date(year, month, 15), // Mitad del mes
          type: 'expense',
          sessionReference: {
            sessionId: session._id,
            sessionName: session.name,
            percentage: percentage,
            month: month,
            year: year,
            isRecurringShare: session.sessionType === 'permanent'
          }
        });

        if (mongoSession) {
          await newPersonalExpense.save({ session: mongoSession });
        } else {
          await newPersonalExpense.save();
        }
      }
    }

    console.log('[DEBUG] Sincronización completada exitosamente');
    return sharedExpense;
  } catch (error) {
    console.error('[ERROR] Error en syncPersonalExpenses:', error);
    throw error;
  }
};

module.exports = {
  syncPersonalExpenses
}; 