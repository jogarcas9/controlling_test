const mongoose = require('mongoose');
const { ParticipantAllocation } = require('../models');

// Función para distribuir montos entre participantes
exports.distributeAmount = async (session) => {
  if (!session.allocations || !Array.isArray(session.allocations)) {
    throw new Error('La sesión no tiene una estructura de asignaciones válida');
  }

  const totalAmount = session.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

  // Crear o actualizar asignaciones para cada participante
  const allocations = [];
  for (const allocation of session.allocations) {
    const amount = (totalAmount * allocation.percentage) / 100;
    
    allocations.push({
      userId: allocation.userId,
      name: allocation.name,
      percentage: allocation.percentage,
      amount: amount
    });
  }

  return allocations;
};

// Función para generar asignaciones mensuales
exports.generateMonthlyAllocations = async (session, year, month) => {
  if (!session || !session.yearlyExpenses) {
    throw new Error('Sesión inválida o sin estructura de gastos');
  }

  // Encontrar los gastos del mes específico
  const yearData = session.yearlyExpenses.find(y => y.year === year);
  const monthData = yearData?.months?.find(m => m.month === month);

  if (!monthData || !monthData.expenses) {
    return [];
  }

  // Calcular el monto total del mes
  const monthlyTotal = monthData.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  // Crear asignaciones basadas en los porcentajes de la sesión
  const allocations = [];
  for (const distribution of session.allocations || []) {
    const amount = (monthlyTotal * distribution.percentage) / 100;
    
    const allocation = new ParticipantAllocation({
      sessionId: session._id,
      userId: distribution.userId,
      name: distribution.name,
      percentage: distribution.percentage,
      amount: amount,
      year: year,
      month: month,
      status: 'pending'
    });

    await allocation.save();
    allocations.push(allocation);
  }

  return allocations;
};

// Función para obtener asignaciones de una sesión
exports.getSessionAllocations = async (sessionId) => {
  return await ParticipantAllocation.find({ sessionId })
    .sort({ year: -1, month: -1 });
};

// Función para obtener asignaciones de un usuario
exports.getUserAllocations = async (userId, status) => {
  const query = { userId };
  if (status) {
    query.status = status;
  }
  
  return await ParticipantAllocation.find(query)
    .sort({ year: -1, month: -1 });
};

// Función para actualizar el estado de una asignación
exports.updateAllocationStatus = async (allocationId, status) => {
  return await ParticipantAllocation.findByIdAndUpdate(
    allocationId,
    { status },
    { new: true }
  );
}; 