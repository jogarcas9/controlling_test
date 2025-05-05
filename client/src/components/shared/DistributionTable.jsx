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

const DistributionTable = ({
  participants,
  expenses,
  onUpdateDistribution,
  loading,
  error
}) => {
  const [participantsWithNames, setParticipantsWithNames] = useState(participants);
  const [percentages, setPercentages] = useState({});
  const [showSettlements, setShowSettlements] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const newPercentages = {};
    participants.forEach(participant => {
      newPercentages[participant.userId] = participant.percentage || Math.round(100 / participants.length);
    });
    setPercentages(newPercentages);
  }, [participants]);

  useEffect(() => {
    const fetchParticipantNames = async () => {
      const updatedParticipants = await Promise.all(
        participants.map(async (participant) => {
          if (participant.name) return participant;
          if (!participant.email) return { ...participant, name: 'Participante' };
          
          try {
            const response = await fetch(`/api/users/by-email/${encodeURIComponent(participant.email)}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            return {
              ...participant,
              name: data.user?.name || participant.email
            };
          } catch (error) {
            console.error('Error al obtener nombre del participante:', error);
            return {
              ...participant,
              name: participant.email || 'Participante'
            };
          }
        })
      );
      setParticipantsWithNames(updatedParticipants);
    };

    fetchParticipantNames();
  }, [participants]);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handlePercentageChange = (participantId, value) => {
    const newValue = Math.max(0, Math.min(100, Number(value) || 0));
    const newPercentages = { ...percentages };
    newPercentages[participantId] = newValue;

    // Ajustar otros porcentajes
    const otherParticipants = participants
      .filter(p => p.userId !== participantId)
      .map(p => p.userId);

    if (otherParticipants.length > 0) {
      const remaining = 100 - newValue;
      const perParticipant = Math.round(remaining / otherParticipants.length);
      
      otherParticipants.forEach((id, index) => {
        if (index === otherParticipants.length - 1) {
          // El último participante toma el resto para asegurar que sume 100
          const sumOthers = otherParticipants.slice(0, -1)
            .reduce((sum, pid) => sum + newPercentages[pid], 0);
          newPercentages[id] = 100 - newValue - sumOthers;
        } else {
          newPercentages[id] = perParticipant;
        }
      });
    }

    setPercentages(newPercentages);
    setValidationError('');
  };

  const validatePercentages = () => {
    const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      setValidationError('Los porcentajes deben sumar 100%');
      return false;
    }
    return true;
  };

  const handleApplyDistribution = () => {
    if (validatePercentages()) {
      onUpdateDistribution(percentages);
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
    const balances = participants.map(p => ({
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
            <TableRow>
              <TableCell>Participante</TableCell>
              <TableCell align="right">Porcentaje</TableCell>
              <TableCell align="right">Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participantsWithNames.map((participant) => (
              <TableRow key={participant.userId}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {participant.name || participant.email}
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
                    value={percentages[participant.userId] || 0}
                    onChange={(e) => handlePercentageChange(participant.userId, e.target.value)}
                    size="small"
                    InputProps={{
                      endAdornment: '%',
                      inputProps: { min: 0, max: 100 }
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

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleApplyDistribution}
          disabled={loading}
          startIcon={<CalculateIcon />}
        >
          Aplicar Distribución
        </Button>
        <Button
          variant="outlined"
          onClick={() => setShowSettlements(!showSettlements)}
          startIcon={showSettlements ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {showSettlements ? 'Ocultar Pagos' : 'Ver Pagos Sugeridos'}
        </Button>
      </Box>

      <Collapse in={showSettlements}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Pagos Sugeridos
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {calculateSettlements().map((settlement, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 1
              }}
            >
              <Typography>{settlement.from}</Typography>
              <SwapIcon color="action" />
              <Typography>{settlement.to}</Typography>
              <Chip
                label={formatCurrency(settlement.amount)}
                color="primary"
                size="small"
                sx={{ ml: 'auto' }}
              />
            </Box>
          ))}

          {calculateSettlements().length === 0 && (
            <Typography color="text.secondary">
              No hay pagos pendientes
            </Typography>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default DistributionTable;
