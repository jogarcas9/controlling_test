import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as IncomeIcon,
  MoreHoriz as MoreHorizIcon,
  CalendarToday as CalendarTodayIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';

// Importar constantes y funciones de utilidad
import { CATEGORY_ICONS, CATEGORY_COLORS, formatAmount } from '../../utils/expenseUtils';

const ExpenseCard = ({ expense, onView, onEdit, onDelete }) => {
  // Parsing and calculations
  const date = new Date(expense.date);
  const formattedDate = format(date, 'dd MMM yyyy', { locale: es });
  const icon = CATEGORY_ICONS[expense.category] || <MoreHorizIcon fontSize="small" />;
  const isIncome = expense.type === 'income';
  const isShared = expense.isFromSharedSession === true;
  
  // Get category color or default
  const getCategoryColor = (category) => CATEGORY_COLORS[category] || '#9e9e9e';
  
  return (
    <Paper 
      sx={{ 
        p: 1.5, 
        mb: 1, 
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 1,
        cursor: 'pointer',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          backgroundColor: isIncome 
            ? '#4caf50' 
            : isShared 
              ? '#2196f3' 
              : getCategoryColor(expense.category),
        }
      }}
      onClick={(e) => {
        // Evitar que el click de los botones de acción se propague
        if (e.defaultPrevented) return;
        onView(expense);
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Chip 
            size="small"
            icon={isIncome ? <IncomeIcon fontSize="small" /> : icon}
            label={expense.category}
            sx={{ 
              backgroundColor: isIncome 
                ? 'rgba(76, 175, 80, 0.1)' 
                : isShared 
                  ? 'rgba(33, 150, 243, 0.1)' 
                  : `${getCategoryColor(expense.category)}20`,
              color: isIncome 
                ? '#4caf50' 
                : isShared 
                  ? '#2196f3' 
                  : getCategoryColor(expense.category),
              fontSize: '0.7rem',
              height: 22
            }}
          />
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ ml: 1, fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}
          >
            <CalendarTodayIcon sx={{ fontSize: '0.85rem', mr: 0.5 }} />
            {formattedDate}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex' }}>
          {/* Solo mostrar botones si no es un gasto de sesión compartida */}
          {!isShared && (
            <>
              <Tooltip title="Editar">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(expense);
                  }} 
                  sx={{ p: 0.5 }}
                >
                  <EditIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(expense._id);
                  }} 
                  sx={{ p: 0.5 }}
                >
                  <DeleteIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {/* Nombre/Descripción del gasto */}
      <Box sx={{ 
        fontWeight: 600, 
        mb: 0.5, 
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Box component="span" sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {expense.name || expense.description}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 700, 
            color: isIncome ? 'success.main' : 'error.main',
            fontSize: '0.9rem'
          }}
        >
          {isIncome ? '+' : '-'}{formatAmount(expense.amount)}
        </Typography>
        
        {expense.isRecurring && (
          <Tooltip title="Gasto recurrente">
            <Chip
              icon={<TimerIcon fontSize="small" />}
              label="Recurrente"
              size="small"
              sx={{ 
                height: 20, 
                fontSize: '0.6rem',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                color: 'primary.main'
              }}
            />
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default ExpenseCard; 