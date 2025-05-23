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
    
    // Número total de participantes únicos
    const totalParticipants = uniqueParticipants.length;
    
    // Si no hay participantes, salir
    if (totalParticipants === 0) {
      console.warn('No se encontraron participantes para la distribución');
      return;
    }
    
    // Distribuir los porcentajes equitativamente
    const equalPercentage = Math.floor(100 / totalParticipants);
    let remainingPercentage = 100 - (equalPercentage * totalParticipants);
    
    uniqueParticipants.forEach((participant, index) => {
      // El último participante recibe el porcentaje restante para asegurar que sume 100%
      const adjustedPercentage = index === totalParticipants - 1 
        ? equalPercentage + remainingPercentage 
        : equalPercentage;
      
      newPercentages[participant.userId] = adjustedPercentage;
    });
    
    console.log('Porcentajes calculados:', newPercentages);
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Distribución de Gastos
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Total a distribuir: {formatCurrency(total)}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {validationError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Participante</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Porcentaje</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participantsWithNames.map((participant, index) => (
              <TableRow key={`participant-${participant.userId || index}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {participant.name && participant.email && !participant.email.includes(participant.name) 
                        ? participant.name 
                        : (participant.email ? participant.email.split('@')[0] : `Participante ${index + 1}`)}
                    </Typography>
                    {participant.canEdit && (
                      <Tooltip title="Puede editar">
                        <EditIcon fontSize="small" color="action" />
                      </Tooltip>
                    )}
                    {participant.canDelete && (
                      <Tooltip title="Puede eliminar">
                        <DeleteIcon fontSize="small" color="action" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={Math.round(percentages[participant.userId] || 0)}
                    onChange={(e) => handlePercentageChange(participant.userId, e.target.value)}
                    size="small"
                    InputProps={{
                      endAdornment: '%',
                      inputProps: { 
                        min: 0, 
                        max: 100,
                        step: 1 // Forzar enteros
                      }
                    }}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(calculateParticipantShare(participant.userId))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleApplyDistribution}
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 'bold' }}
        >
          Aplicar Distribución
        </Button>
      </Box>
    </Box>
  );
};

export default DistributionTable;
