import { useState, useCallback, useEffect } from 'react';

const useDistribution = (expenses = [], participants = []) => {
  const [distributions, setDistributions] = useState([]);
  const [error, setError] = useState(null);

  const calculateEqualDistribution = useCallback(() => {
    if (!expenses.length || !participants.length) return [];

    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const equalShare = totalAmount / participants.length;

    return participants.map(participant => ({
      userId: participant.userId,
      name: participant.name,
      amount: equalShare,
      percentage: (100 / participants.length).toFixed(2)
    }));
  }, [expenses, participants]);

  const calculateCustomDistribution = useCallback((percentages) => {
    if (!expenses.length || !participants.length) return [];

    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return participants.map(participant => {
      const percentage = percentages[participant.userId] || 0;
      return {
        userId: participant.userId,
        name: participant.name,
        amount: (totalAmount * percentage) / 100,
        percentage: percentage.toFixed(2)
      };
    });
  }, [expenses, participants]);

  const calculateSettlements = useCallback((distributions) => {
    if (!distributions.length) return [];

    const settlements = [];
    const balances = new Map();

    // Calcular balances
    distributions.forEach(dist => {
      balances.set(dist.userId, dist.amount);
    });

    // Encontrar la cantidad promedio que cada uno debería pagar
    const totalAmount = Array.from(balances.values()).reduce((sum, amount) => sum + amount, 0);
    const averageAmount = totalAmount / balances.size;

    // Calcular deudas y créditos
    const debtors = [];
    const creditors = [];

    balances.forEach((amount, userId) => {
      const balance = amount - averageAmount;
      const participant = participants.find(p => p.userId === userId);
      
      if (balance < 0) {
        debtors.push({ userId, name: participant.name, amount: Math.abs(balance) });
      } else if (balance > 0) {
        creditors.push({ userId, name: participant.name, amount: balance });
      }
    });

    // Calcular liquidaciones
    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];
      
      const amount = Math.min(debtor.amount, creditor.amount);
      
      if (amount > 0) {
        settlements.push({
          from: debtor.userId,
          fromName: debtor.name,
          to: creditor.userId,
          toName: creditor.name,
          amount: Number(amount.toFixed(2))
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) debtors.shift();
      if (creditor.amount < 0.01) creditors.shift();
    }

    return settlements;
  }, [participants]);

  useEffect(() => {
    try {
      const newDistributions = calculateEqualDistribution();
      setDistributions(newDistributions);
      setError(null);
    } catch (err) {
      setError('Error al calcular la distribución inicial');
      console.error('Error calculating initial distribution:', err);
    }
  }, [expenses, participants, calculateEqualDistribution]);

  return {
    distributions,
    error,
    calculateEqualDistribution,
    calculateCustomDistribution,
    calculateSettlements
  };
};

export default useDistribution; 