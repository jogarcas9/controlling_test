import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Calculate as CalculateIcon,
  SwapHoriz as SwapIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/helpers';
import * as sharedSessionService from '../../services/sharedSessionService';

const DistributionTable = ({
  participants,
  expenses,
  onUpdateDistribution,
  loading,
  error,
  currentMonth,
  currentYear
}) => {
  // Eliminar duplicados basados en userId
  const uniqueParticipants = Array.from(new Map(
    participants.map(p => [p.userId, p])
  ).values());

  const [participantsWithNames, setParticipantsWithNames] = useState(uniqueParticipants);
  const [percentages, setPercentages] = useState({});
  const [showSettlements, setShowSettlements] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Caché local para nombres de usuario por email
  const userNameCache = {};

  useEffect(() => {
    // Aplicar filtro de participantes únicos
    const uniqueParticipants = Array.from(new Map(
      participants.filter(p => p && p.userId).map(p => [p.userId, p])
    ).values());
    
    console.log('Participantes recibidos:', participants);
    console.log('Participantes únicos filtrados:', uniqueParticipants);
    
    const newPercentages = {};
    
    // Usar los porcentajes existentes de la base de datos
    uniqueParticipants.forEach((participant) => {
      newPercentages[participant.userId] = participant.percentage || 0;
    });
    
    // Si no hay porcentajes definidos, distribuir equitativamente
    const totalDefined = Object.values(newPercentages).reduce((sum, p) => sum + p, 0);
    if (totalDefined === 0 && uniqueParticipants.length > 0) {
      const equalPercentage = Math.floor(100 / uniqueParticipants.length);
      let remainingPercentage = 100 - (equalPercentage * uniqueParticipants.length);
      
      uniqueParticipants.forEach((participant, index) => {
        newPercentages[participant.userId] = index === uniqueParticipants.length - 1 
          ? equalPercentage + remainingPercentage 
          : equalPercentage;
      });
    }
    
    console.log('Porcentajes inicializados:', newPercentages);
    setPercentages(newPercentages);
    setParticipantsWithNames(uniqueParticipants);
  }, [participants]);

  useEffect(() => {
    const fetchParticipantNames = async () => {
      console.log('Obteniendo nombres para participantes:', participantsWithNames);
      
      if (!participantsWithNames.length) return;
      
      // Procesar todos los participantes en paralelo
      const updatedParticipants = await Promise.all(
        participantsWithNames.map(async (participant) => {
          if (!participant.email) return participant;
          // Si ya está en caché, usarlo directamente
          if (userNameCache[participant.email]) {
            return { ...participant, name: userNameCache[participant.email] };
          }
          try {
            const result = await sharedSessionService.getUserByEmail(participant.email);
            let name = participant.email.split('@')[0];
            if (result && result.user && result.user.name) {
              name = result.user.name;
            }
            // Guardar en caché
            userNameCache[participant.email] = name;
            return { ...participant, name };
          } catch (error) {
            // Fallback: usar el email como nombre y guardar en caché
            userNameCache[participant.email] = participant.email.split('@')[0];
            return { ...participant, name: participant.email.split('@')[0] };
          }
        })
      );
      
      console.log('Participantes con nombres actualizados:', updatedParticipants);
      setParticipantsWithNames(updatedParticipants);
    };

    fetchParticipantNames();
  }, [participants]);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handlePercentageChange = (participantId, value) => {
    // Redondear al entero más cercano y asegurar que esté entre 0 y 100
    const newValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    
    // Si no cambió el valor, no hacer nada
    if (newValue === percentages[participantId]) {
      return;
    }
    
    const newPercentages = { ...percentages };
    newPercentages[participantId] = newValue;

    // Ajustar otros porcentajes para mantener la suma en 100%
    const otherParticipants = participantsWithNames
      .filter(p => p.userId !== participantId)
      .map(p => p.userId);

    if (otherParticipants.length > 0) {
      const remaining = 100 - newValue;
      
      // Si solo hay un participante adicional, darle todo el resto
      if (otherParticipants.length === 1) {
        newPercentages[otherParticipants[0]] = remaining;
      } else {
        // Si hay más de uno, distribuir proporcionalmente
        const perParticipant = Math.floor(remaining / otherParticipants.length);
        let remainderForDistribution = remaining - (perParticipant * otherParticipants.length);
        
        otherParticipants.forEach((id, index) => {
          if (index === 0) {
            newPercentages[id] = perParticipant + remainderForDistribution;
          } else {
            newPercentages[id] = perParticipant;
          }
        });
      }
    }

    // Verificar que sume exactamente 100
    const sum = Object.values(newPercentages).reduce((a, b) => a + b, 0);
    if (sum !== 100 && otherParticipants.length > 0) {
      // Ajustar el primer "otro" participante para asegurar suma exacta
      newPercentages[otherParticipants[0]] += (100 - sum);
    }

    setPercentages(newPercentages);
    setValidationError('');
  };

  const validatePercentages = () => {
    const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {  // Tolerancia de 0.1 para errores de redondeo
      setValidationError(`Los porcentajes deben sumar 100%. Actualmente suman ${sum}%`);
      return false;
    }
    return true;
  };

  const handleApplyDistribution = () => {
    // Asegurar que sumen 100% exactamente antes de aplicar
    const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
    if (sum !== 100 && participantsWithNames.length > 0) {
      // Ajustar silenciosamente el primer participante para que sume 100%
      const newPercentages = { ...percentages };
      newPercentages[participantsWithNames[0].userId] += (100 - sum);
      setPercentages(newPercentages);
      
      // Validar de nuevo con los valores ajustados
      if (validatePercentages()) {
        const distribution = participantsWithNames.map(participant => ({
          userId: participant.userId,
          name: participant.name,
          percentage: newPercentages[participant.userId]
        }));
        
        console.log('Aplicando distribución:', distribution);
        onUpdateDistribution(distribution, currentMonth, currentYear);
      }
    } else {
      if (validatePercentages()) {
        const distribution = participantsWithNames.map(participant => ({
          userId: participant.userId,
          name: participant.name,
          percentage: percentages[participant.userId]
        }));
        
        console.log('Aplicando distribución:', distribution);
        onUpdateDistribution(distribution, currentMonth, currentYear);
      }
    }
  };

  const calculateParticipantShare = (participantId) => {
    return (total * percentages[participantId]) / 100;
  };

  const calculateParticipantPaid = (participantId) => {
    return expenses
      .filter(expense => expense.paidBy === participantId)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const calculateBalance = (participantId) => {
    const paid = calculateParticipantPaid(participantId);
    const share = calculateParticipantShare(participantId);
    return paid - share;
  };

  const calculateSettlements = () => {
    const balances = participantsWithNames.map(p => ({
      id: p.userId,
      name: p.name,
      balance: calculateBalance(p.userId)
    }));

    const settlements = [];
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);

    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount
      });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) debtors.shift();
      if (Math.abs(creditor.balance) < 0.01) creditors.shift();
    }

    return settlements;
  };

  // Renombrando variables no utilizadas
  const _IconButton = IconButton;
  const _CalculateIcon = CalculateIcon;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Distribución de Gastos
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Total a distribuir: {formatCurrency(total)}
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell sx={{ color: 'white' }}>Participante</TableCell>
              <TableCell align="center" sx={{ color: 'white' }}>Porcentaje</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participantsWithNames.map((participant) => (
              <TableRow key={participant.userId}>
                <TableCell>{participant.name}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TextField
                      type="number"
                      value={percentages[participant.userId] || 0}
                      onChange={(e) => handlePercentageChange(participant.userId, e.target.value)}
                      inputProps={{
                        min: 0,
                        max: 100,
                        style: { textAlign: 'right', width: '50px' }
                      }}
                      variant="outlined"
                      size="small"
                      sx={{ width: '80px' }}
                    />
                    <Typography sx={{ ml: 1 }}>%</Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {formatCurrency((total * (percentages[participant.userId] || 0)) / 100)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleApplyDistribution}
          disabled={loading}
        >
          Aplicar Distribución
        </Button>
      </Box>
    </Box>
  );
};

export default DistributionTable;
