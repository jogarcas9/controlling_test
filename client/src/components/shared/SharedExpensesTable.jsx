import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Grid,
  Stack,
  useTheme,
  useMediaQuery,
  alpha,
  TablePagination,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon
} from '@mui/icons-material';

const SharedExpensesTable = ({
  expenses = [],
  onEdit,
  onDelete,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedRows, setExpandedRows] = React.useState({});

  const handleExpandClick = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getCategoryColor = (category) => {
    const categoryColors = {
      food: theme.palette.success.main,
      transport: theme.palette.info.main,
      accommodation: theme.palette.warning.main,
      entertainment: theme.palette.secondary.main,
      shopping: theme.palette.error.main,
      other: theme.palette.grey[500]
    };
    return categoryColors[category] || theme.palette.grey[500];
  };

  const renderExpenseCard = (expense) => (
    <Card 
      sx={{ 
        borderRadius: 2,
        background: theme.palette.mode === 'dark' 
          ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette.background.paper, 0.6)})`
          : `linear-gradient(135deg, ${alpha('#ffffff', 0.9)}, ${alpha('#ffffff', 0.7)})`,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        position: 'relative',
        overflow: 'hidden',
        height: '100%'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, mr: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={t(expense.category)}
                size="small"
                sx={{
                  bgcolor: alpha(getCategoryColor(expense.category), 0.1),
                  color: getCategoryColor(expense.category),
                  fontWeight: 'medium',
                  borderRadius: 1,
                  height: '24px',
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <CalendarIcon sx={{ fontSize: '0.9rem' }} />
                {formatDate(expense.date)}
              </Typography>
            </Box>
            <Typography 
              variant="subtitle1" 
              fontWeight="medium"
              sx={{
                fontSize: '1.1rem',
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {expense.description}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: theme.palette.error.main,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {formatAmount(expense.amount)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => handleExpandClick(expense.id)}
              sx={{ 
                color: theme.palette.text.secondary,
                p: 0.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              {expandedRows[expense.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expandedRows[expense.id]}>
          <Box 
            sx={{ 
              pt: 2,
              mt: 2,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {expense.participants?.length || 0} participantes
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={t('edit')}>
                  <IconButton
                    size="small"
                    onClick={() => onEdit(expense)}
                    sx={{ 
                      color: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2)
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
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.2)
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );

  if (!expenses || expenses.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">
          {t('noExpensesFound')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {expenses.map((expense) => (
            <Grid item xs={12} sm={isTablet ? 6 : 12} key={expense.id}>
              {renderExpenseCard(expense)}
            </Grid>
          ))}
        </Grid>
      </Box>
      
      <Box sx={{ p: 2 }}>
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
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              px: 1,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1)
              }
            },
            '.MuiTablePagination-actions': {
              gap: 0.5,
              '& .MuiIconButton-root': {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 2,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }
              }
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default SharedExpensesTable; 