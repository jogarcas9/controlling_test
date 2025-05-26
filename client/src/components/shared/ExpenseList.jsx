import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Typography,
  Chip,
  Tooltip,
  TablePagination,
  useTheme,
  useMediaQuery,
  Grid
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarTodayIcon,
  Category as CategoryIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/helpers';

// Componente de tarjeta de gasto para móviles
const ExpenseCard = ({ expense, onEdit, onDelete, canEdit }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isIncome = expense.type === 'income';
  
  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 1.5, 
        borderRadius: 2,
        borderLeft: isIncome ? `4px solid ${theme.palette.success.main}` : `4px solid ${theme.palette.primary.main}`
      }}
      elevation={1}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: 1
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium', fontSize: '0.95rem' }}>
          {expense.name || 'Sin nombre'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {canEdit && (
            <>
              <IconButton 
                size="small" 
                onClick={() => onEdit(expense)}
                sx={{ 
                  p: 0.5,
                  '&:hover': {
                    backgroundColor: 'action.selected'
                  }
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => onDelete(expense)}
                sx={{ 
                  p: 0.5,
                  color: theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: 'action.selected'
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          {expense.category || 'Sin categoría'}
        </Typography>
        <Typography variant="body2" sx={{ 
          fontWeight: 'bold', 
          color: isIncome ? 'success.main' : 'primary.main',
          fontSize: '0.9rem'
        }}>
          {formatCurrency(expense.amount)}
        </Typography>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          {formatDate(expense.date)}
        </Typography>
        {expense.isRecurring && (
          <Chip
            icon={<RefreshIcon fontSize="small" />}
            label="Recurrente"
            size="small"
            color="info"
            sx={{ height: 22, fontSize: '0.65rem' }}
          />
        )}
      </Box>
    </Paper>
  );
};

const ExpenseList = ({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  total,
  loading,
  userRole,
  currentSession
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const canAddExpense = true;
  
  const isSessionParticipant = () => {
    return true;
  };

  const canEditExpense = (expense) => {
    return true;
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography variant="h6" component="h2" sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
          Lista de Gastos
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canAddExpense && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddExpense}
              size={isMobile ? "small" : "medium"}
              sx={{ 
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                height: 40,
                minWidth: isMobile ? 80 : 'auto',
                borderRadius: 1
              }}
            >
              {isMobile ? "Nuevo" : "Nuevo Gasto"}
            </Button>
          )}
        </Box>
      </Box>

      {/* Mostrar total */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        mb: 2,
        backgroundColor: 'primary.light',
        p: 1,
        borderRadius: 1
      }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'white' }}>
          Total: {formatCurrency(total)}
        </Typography>
      </Box>

      {isMobile ? (
        <Box sx={{ mb: 2 }}>
          {expenses
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                onEdit={onEditExpense}
                onDelete={onDeleteExpense}
                canEdit={canEditExpense(expense)}
              />
            ))}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <TablePagination
              component="div"
              count={expenses.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10]}
              labelRowsPerPage=""
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </Box>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Recurrente</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>{expense.name || 'Sin nombre'}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={expense.isRecurring ? "Sí" : "No"}
                        color={expense.isRecurring ? "info" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canEditExpense(expense) && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => onEditExpense(expense)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => onDeleteExpense(expense)}
                              sx={{ color: theme.palette.error.main }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={expenses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}
    </Box>
  );
};

export default ExpenseList;
