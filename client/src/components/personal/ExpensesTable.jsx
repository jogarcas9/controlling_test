import React from 'react';
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
  Stack
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Euro as EuroIcon
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

  const getCategoryColor = (category) => {
    const categoryColors = {
      food: theme.palette.success.main,
      transport: theme.palette.info.main,
      entertainment: theme.palette.warning.main,
      health: theme.palette.error.main,
      other: theme.palette.grey[500]
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
        <EuroIcon fontSize="small" />
        {type === 'income' ? '+' : '-'}{formattedAmount}
      </Typography>
    );
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
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
                  {expense.description}
                </Typography>
                {formatAmount(expense.amount, expense.type)}
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  label={t(expense.category)}
                  size="small"
                  sx={{
                    bgcolor: alpha(getCategoryColor(expense.category), 0.1),
                    color: getCategoryColor(expense.category),
                    fontWeight: 'medium',
                    borderRadius: 2
                  }}
                />
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
            }}>{t('description')}</TableCell>
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
                onClick={() => onSort('amount')}
              >
                {t('amount')}
                {sortBy === 'amount' && (
                  sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                )}
              </Box>
            </TableCell>
            <TableCell align="right" sx={{ 
              fontWeight: 'bold',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>{t('actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow
              key={expense.id}
              sx={{
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05)
                }
              }}
            >
              <TableCell>{formatDate(expense.date)}</TableCell>
              <TableCell>{expense.description}</TableCell>
              <TableCell>
                <Chip
                  label={t(expense.category)}
                  size="small"
                  sx={{
                    bgcolor: alpha(getCategoryColor(expense.category), 0.1),
                    color: getCategoryColor(expense.category),
                    fontWeight: 'medium',
                    borderRadius: 2
                  }}
                />
              </TableCell>
              <TableCell>{formatAmount(expense.amount, expense.type)}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      {isMobile ? renderMobileView() : renderDesktopView()}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage={t('rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} ${t('of')} ${count}`
        }
        sx={{
          '.MuiTablePagination-select': {
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: 1
          },
          '.MuiTablePagination-actions': {
            '& .MuiIconButton-root': {
              borderRadius: 2,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1)
              }
            }
          }
        }}
      />
    </>
  );
};

export default ExpensesTable; 