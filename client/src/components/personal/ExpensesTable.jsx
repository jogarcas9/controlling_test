import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Box,
  Typography,
  useTheme,
  alpha,
  Tooltip,
  TablePagination,
  useMediaQuery,
  Paper,
  Card,
  CardContent,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Collapse,
  Grid
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Euro as EuroIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  CalendarToday as CalendarIcon,
  Repeat as RepeatIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const ExpensesTable = ({
  expenses,
  onEdit,
  onDelete,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  sortBy,
  sortDirection,
  onSort
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedRows, setExpandedRows] = useState({});
  const [detailsDialog, setDetailsDialog] = useState({ open: false, expense: null });

  const handleExpandClick = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenDetails = (expense) => {
    setDetailsDialog({ open: true, expense });
  };

  const handleCloseDetails = () => {
    setDetailsDialog({ open: false, expense: null });
  };

  const getCategoryColor = (category) => {
    const categoryColors = {
      food: theme.palette.success.main,
      transport: theme.palette.info.main,
      entertainment: theme.palette.warning.main,
      health: theme.palette.error.main,
      other: theme.palette.grey[500],
      'Gastos Compartidos': theme.palette.secondary.main,
      'Transporte': theme.palette.info.main,
      'Comida': theme.palette.success.main,
      'Ocio': theme.palette.warning.main,
      'Alquiler': theme.palette.error.main,
      'Tarjetas': theme.palette.error.dark,
      'Préstamos': theme.palette.error.light,
      'Servicios': theme.palette.info.dark,
      'Gastos hijo': theme.palette.warning.dark
    };
    return categoryColors[category] || theme.palette.grey[500];
  };

  const formatAmount = (amount, type) => {
    const formattedAmount = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(Math.abs(amount));

    return (
      <Typography
        component="span"
        sx={{
          color: type === 'income' ? theme.palette.success.main : theme.palette.error.main,
          fontWeight: 'medium',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}
      >
        {type === 'income' ? '+' : '-'}{formattedAmount}
      </Typography>
    );
  };

  const formatDate = (date) => {
    try {
      if (!date) return 'Fecha no disponible';
      
      const dateObj = new Date(date);
      // Verificar si la fecha es válida
      if (isNaN(dateObj.getTime())) return 'Fecha no disponible';
      
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha no disponible';
    }
  };

  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {expenses.map((expense) => (
        <Card
          key={expense.id}
          sx={{
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {expense.name || expense.description}
                </Typography>
                {formatAmount(expense.amount, expense.type)}
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={expense.category}
                    size="small"
                    sx={{
                      bgcolor: alpha(getCategoryColor(expense.category), 0.1),
                      color: getCategoryColor(expense.category),
                      fontWeight: 'medium',
                      borderRadius: 2
                    }}
                  />
                  {expense.isRecurring && (
                    <Tooltip title={t('recurring')}>
                      <RepeatIcon fontSize="small" color="action" />
                    </Tooltip>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(expense.date)}
                </Typography>
              </Box>

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 1,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                pt: 1
              }}>
                <Tooltip title={t('details')}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDetails(expense)}
                    sx={{ 
                      color: theme.palette.info.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.info.main, 0.1)
                      }
                    }}
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('edit')}>
                  <IconButton
                    size="small"
                    onClick={() => onEdit(expense)}
                    sx={{ 
                      color: theme.palette.primary.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1)
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('delete')}>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(expense.id)}
                    sx={{ 
                      color: theme.palette.error.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.1)
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderDesktopView = () => (
    <TableContainer component={Paper} sx={{ 
      borderRadius: 3,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ 
              fontWeight: 'bold',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>{t('name')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>{t('category')}</TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    color: theme.palette.primary.main
                  }
                }}
                onClick={() => onSort('date')}
              >
                {t('date')}
                {sortBy === 'date' && (
                  sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                )}
              </Box>
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    color: theme.palette.primary.main
                  }
                }}
                onClick={() => onSort('amount')}
              >
                {t('amount')}
                {sortBy === 'amount' && (
                  sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                )}
              </Box>
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 'bold',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>{t('recurring')}</TableCell>
            <TableCell align="center" sx={{ 
              fontWeight: 'bold',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>{t('actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {expenses.map((expense) => (
            <React.Fragment key={expense.id}>
              <TableRow
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                  },
                  cursor: 'pointer'
                }}
                onClick={() => handleExpandClick(expense.id)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {expense.name || expense.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={expense.category}
                    size="small"
                    sx={{
                      bgcolor: alpha(getCategoryColor(expense.category), 0.1),
                      color: getCategoryColor(expense.category),
                      fontWeight: 'medium',
                      borderRadius: 2
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">{formatDate(expense.date)}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{formatAmount(expense.amount, expense.type)}</TableCell>
                <TableCell>
                  {expense.isRecurring ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={t('yes')} 
                        size="small"
                        color="primary"
                        variant="outlined"
                        icon={<RepeatIcon />}
                      />
                    </Box>
                  ) : (
                    <Chip 
                      label={t('no')} 
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title={t('details')}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(expense);
                        }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('edit')}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(expense);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('delete')}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(expense.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedRows[expense.id] ? t('collapse') : t('expand')}>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandClick(expense.id);
                        }}
                      >
                        {expandedRows[expense.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={7} style={{ paddingTop: 0, paddingBottom: 0, border: 0 }}>
                  <Collapse in={expandedRows[expense.id]} timeout="auto" unmountOnExit>
                    <Box sx={{ py: 2, px: 3 }}>
                      <Typography variant="subtitle2" gutterBottom component="div">
                        {t('details')}
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>{t('description')}:</strong> {expense.description}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>{t('category')}:</strong> {expense.category}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>{t('date')}:</strong> {formatDate(expense.date)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>{t('type')}:</strong> {expense.type === 'income' ? t('income') : t('expense')}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>{t('amount')}:</strong> {formatAmount(expense.amount, expense.type)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>{t('recurring')}:</strong> {expense.isRecurring ? t('yes') : t('no')}
                            </Typography>
                          </Grid>
                          {expense.sessionReference && (
                            <Grid item xs={12}>
                              <Typography variant="body2">
                                <strong>{t('sharedSession')}:</strong> {expense.sessionReference.sessionName || '-'}
                              </Typography>
                              {expense.sessionReference.percentage && (
                                <Typography variant="body2">
                                  <strong>{t('percentage')}:</strong> {expense.sessionReference.percentage}%
                                </Typography>
                              )}
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {isMobile ? renderMobileView() : renderDesktopView()}
      
      <TablePagination
        component="div"
        count={totalCount || expenses.length}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage={t('rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('of')} ${count}`}
      />

      {/* Modal de detalles */}
      <Dialog
        open={detailsDialog.open}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">{t('expenseDetails')}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {detailsDialog.expense && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold">{detailsDialog.expense.description}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">{t('category')}</Typography>
                <Typography variant="body1">{detailsDialog.expense.category}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">{t('date')}</Typography>
                <Typography variant="body1">{formatDate(detailsDialog.expense.date)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">{t('amount')}</Typography>
                <Typography variant="body1">{formatAmount(detailsDialog.expense.amount, detailsDialog.expense.type)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">{t('recurring')}</Typography>
                <Typography variant="body1">{detailsDialog.expense.isRecurring ? t('yes') : t('no')}</Typography>
              </Grid>
              {detailsDialog.expense.sessionReference && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">{t('sharedSession')}</Typography>
                    <Typography variant="body1">{detailsDialog.expense.sessionReference.sessionName || '-'}</Typography>
                  </Grid>
                  {detailsDialog.expense.sessionReference.percentage && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">{t('percentage')}</Typography>
                      <Typography variant="body1">{detailsDialog.expense.sessionReference.percentage}%</Typography>
                    </Grid>
                  )}
                  {detailsDialog.expense.sessionReference.year !== undefined && detailsDialog.expense.sessionReference.month !== undefined && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">{t('period')}</Typography>
                      <Typography variant="body1">
                        {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
                          .format(new Date(detailsDialog.expense.sessionReference.year, detailsDialog.expense.sessionReference.month))}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} color="primary">
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpensesTable; 