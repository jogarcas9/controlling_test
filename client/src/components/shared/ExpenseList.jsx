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
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarTodayIcon,
  Category as CategoryIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { getExpenseTypeLabel } from '../../utils/expenseUtils';

// Componente de tarjeta de gasto para móviles
const ExpenseCard = ({ expense, onEdit, onDelete, canEdit, onViewDetails }) => {
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
          <IconButton
            size="small"
            onClick={() => onViewDetails(expense)}
            sx={{
              p: 0.5,
              '&:hover': {
                backgroundColor: 'action.selected'
              }
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
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
  currentSession,
  selectedMonth,
  selectedYear
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (expense) => {
    setSelectedExpense(expense);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedExpense(null);
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
        mb: 3
      }}>
        <Typography variant="h6" component="h2">
          Gastos
          <Typography 
            component="span" 
            variant="subtitle1" 
            color="text.secondary" 
            sx={{ ml: 2 }}
          >
            Total: {formatCurrency(total)}
          </Typography>
        </Typography>
        {canAddExpense && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddExpense}
            size={isMobile ? "small" : "medium"}
          >
            Añadir Gasto
          </Button>
        )}
      </Box>

      {isMobile ? (
        <Box sx={{ mb: 2 }}>
          {expenses
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((expense) => {
              // Calcular el tipo de gasto con la fecha del mes seleccionado
              const currentDate = new Date(selectedYear, selectedMonth);
              const typeLabel = getExpenseTypeLabel(expense, currentDate);

              return (
                <ExpenseCard
                  key={expense._id}
                  expense={{...expense, typeLabel}}
                  onEdit={onEditExpense}
                  onDelete={onDeleteExpense}
                  onViewDetails={handleViewDetails}
                  canEdit={canEditExpense(expense)}
                />
              );
            })}
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
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((expense) => {
                  // Calcular el tipo de gasto con la fecha del mes seleccionado
                  const currentDate = new Date(selectedYear, selectedMonth);
                  const typeLabel = getExpenseTypeLabel(expense, currentDate);

                  return (
                    <TableRow key={expense._id}>
                      <TableCell>{expense.name || 'Sin nombre'}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={typeLabel}
                          color={
                            expense.isRecurring ? "primary" :
                            expense.isPeriodic ? "info" :
                            "default"
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver detalles">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(expense)}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
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
                  );
                })}
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

      {/* Diálogo de detalles del gasto */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            width: '100%',
            m: isMobile ? 1 : 2
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">Detalles del Gasto</Typography>
        </DialogTitle>
        <DialogContent 
          dividers
          sx={{
            px: isMobile ? 2 : 3,
            py: 2,
            overflowX: 'hidden'
          }}
        >
          {selectedExpense && (
            <Grid 
              container 
              spacing={isMobile ? 2 : 3}
              sx={{ width: '100%', m: 0 }}
            >
              <Grid item xs={12}>
                <Typography 
                  variant="subtitle1" 
                  fontWeight="bold"
                  sx={{
                    wordBreak: 'break-word'
                  }}
                >
                  {selectedExpense.name || selectedExpense.description || 'Sin nombre'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Categoría</Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    wordBreak: 'break-word',
                    mt: 0.5 
                  }}
                >
                  {selectedExpense.category || 'Sin categoría'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Fecha</Typography>
                <Typography 
                  variant="body1"
                  sx={{ mt: 0.5 }}
                >
                  {formatDate(selectedExpense.date)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Monto</Typography>
                <Typography 
                  variant="body1" 
                  color={selectedExpense.type === 'income' ? 'success.main' : 'primary.main'}
                  sx={{ mt: 0.5 }}
                >
                  {formatCurrency(selectedExpense.amount)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Recurrente</Typography>
                <Typography 
                  variant="body1"
                  sx={{ mt: 0.5 }}
                >
                  {selectedExpense.isRecurring ? 'Sí' : 'No'}
                </Typography>
              </Grid>
              {selectedExpense.description && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Descripción</Typography>
                  <Typography 
                    variant="body1"
                    sx={{ 
                      wordBreak: 'break-word',
                      mt: 0.5 
                    }}
                  >
                    {selectedExpense.description}
                  </Typography>
                </Grid>
              )}
              {currentSession && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Sesión Compartida</Typography>
                  <Typography 
                    variant="body1"
                    sx={{ 
                      wordBreak: 'break-word',
                      mt: 0.5 
                    }}
                  >
                    {currentSession.name}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 3, py: 1.5 }}>
          <Button onClick={handleCloseDetails}>Cerrar</Button>
          {selectedExpense && canEditExpense(selectedExpense) && (
            <Button 
              onClick={() => {
                handleCloseDetails();
                onEditExpense(selectedExpense);
              }}
              color="primary"
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseList;
