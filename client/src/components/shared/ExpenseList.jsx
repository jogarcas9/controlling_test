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
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/helpers';

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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
  
  const canDeleteExpense = (expense) => {
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
        <Typography variant="h6" component="h2">
          Lista de Gastos
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {canAddExpense && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddExpense}
            >
              Nuevo Gasto
            </Button>
          )}
        </Box>
      </Box>

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
                  <TableCell>{expense.name}</TableCell>
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
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => onEditExpense(expense)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDeleteExpense(expense) && (
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => onDeleteExpense(expense)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
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
    </Box>
  );
};

export default ExpenseList;
