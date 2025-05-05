import { useState, useCallback, useEffect } from 'react';

export const useDistribution = (expenses = [], participants = []) => {
  const [distributions, setDistributions] = useState([]);
  const [error, setError] = useState(null);

  // Calcular distribución igual para todos los participantes
  const calculateEqualDistribution = useCallback(() => {
    if (!participants.length) return [];
    
    try {
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const equalShare = total / participants.length;
      
      const distribution = participants.map(participant => ({
        userId: participant._id || participant.userId,
        name: participant.name || participant.email,
        amount: equalShare,
        percentage: (100 / participants.length)
      }));
      
      setDistributions(distribution);
      return distribution;
    } catch (err) {
      console.error('Error al calcular distribución igualitaria:', err);
      setError('Error al calcular distribución igualitaria');
      return [];
    }
  }, [expenses, participants]);

  // Calcular distribución personalizada basada en porcentajes
  const calculateCustomDistribution = useCallback((percentages) => {
    if (!participants.length || !percentages) return [];
    
    try {
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      const distribution = participants.map(participant => {
        const userId = participant._id || participant.userId;
        const percentage = percentages[userId] || 0;
        return {
          userId,
          name: participant.name || participant.email,
          amount: (total * percentage) / 100,
          percentage
        };
      });
      
      setDistributions(distribution);
      return distribution;
    } catch (err) {
      console.error('Error al calcular distribución personalizada:', err);
      setError('Error al calcular distribución personalizada');
      return [];
    }
  }, [expenses, participants]);

  // Calcular liquidaciones (quién debe a quién)
  const calculateSettlements = useCallback(() => {
    if (!distributions.length) return [];
    
    try {
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Crear mapa de quién ha pagado qué
      const paidMap = {};
      expenses.forEach(expense => {
        const payerId = expense.paidBy;
        paidMap[payerId] = (paidMap[payerId] || 0) + expense.amount;
      });
      
      // Calcular balance neto de cada participante
      const balances = distributions.map(dist => {
        const paid = paidMap[dist.userId] || 0;
        const owes = dist.amount;
        return {
          userId: dist.userId,
          name: dist.name,
          paid,
          owes,
          balance: paid - owes  // Positivo = debe recibir, Negativo = debe pagar
        };
      });
      
      // Calcular transacciones necesarias para liquidar deudas
      const settlements = [];
      const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
      const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
      
      let i = 0, j = 0;
      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        
        const debtAmount = Math.min(Math.abs(debtor.balance), creditor.balance);
        
        if (debtAmount > 0) {
          settlements.push({
            from: debtor,
            to: creditor,
            amount: debtAmount
          });
          
          debtor.balance += debtAmount;
          creditor.balance -= debtAmount;
        }
        
        if (Math.abs(debtor.balance) < 0.01) i++;
        if (Math.abs(creditor.balance) < 0.01) j++;
      }
      
      return settlements;
    } catch (err) {
      console.error('Error al calcular liquidaciones:', err);
      setError('Error al calcular liquidaciones');
      return [];
    }
  }, [distributions, expenses]);

  // Inicializar distribución igualitaria por defecto
  useEffect(() => {
    if (participants.length > 0 && expenses.length > 0) {
      calculateEqualDistribution();
    }
  }, [participants, expenses, calculateEqualDistribution]);

  return {
    distributions,
    error,
    calculateEqualDistribution,
    calculateCustomDistribution,
    calculateSettlements
  };
};

export default useDistribution; 