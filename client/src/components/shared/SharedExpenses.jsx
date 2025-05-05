import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Typography,
  Grid,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  Close as CloseIcon,
  Group as GroupIcon,
  Euro as EuroIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { StyledCard } from '../common/StyledCard';
import StatCard from '../common/StatCard';
import ExpensesTable from '../personal/ExpensesTable';

const SharedExpenses = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('new'); // 'new' o 'edit'
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    participants: []
  });

  // Estados para filtros y ordenamiento
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Categorías de gastos compartidos
  const categories = [
    'food',
    'transport',
    'accommodation',
    'entertainment',
    'shopping',
    'other'
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Aquí irían las llamadas a la API
        // const sessionsResponse = await axios.get('/api/shared-sessions');
        // const expensesResponse = await axios.get('/api/shared-expenses');
        // setSessions(sessionsResponse.data);
        // setExpenses(expensesResponse.data);
        
        // Datos de ejemplo
        setSessions([
          { id: 1, name: 'Viaje a Barcelona', participants: 4 },
          { id: 2, name: 'Cena de cumpleaños', participants: 6 }
        ]);
        
        setExpenses([
          {
            id: 1,
            sessionId: 1,
            amount: 45.50,
            description: 'Cena en restaurante',
            category: 'food',
            date: '2024-03-15',
            participants: [1, 2, 3, 4]
          }
        ]);
        
        setLoading(false);
      } catch (err) {
        setError(t('errorLoadingData'));
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Manejadores de diálogo
  const handleOpenDialog = (type, expense = null) => {
    setDialogType(type);
    if (type === 'edit' && expense) {
      setFormData({
        ...expense,
        date: new Date(expense.date).toISOString().split('T')[0]
      });
    } else {
      setFormData({
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        participants: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      participants: []
    });
  };

  // Manejadores de formulario
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Aquí iría la llamada a la API
      // if (dialogType === 'new') {
      //   await axios.post('/api/shared-expenses', formData);
      // } else {
      //   await axios.put(`/api/shared-expenses/${formData.id}`, formData);
      // }
      handleCloseDialog();
      // Recargar datos
    } catch (err) {
      setError(t('errorSavingData'));
    }
  };

  // Manejadores de filtros y ordenamiento
  const handleFilterClick = (event) => setFilterAnchorEl(event.currentTarget);
  const handleSortClick = (event) => setSortAnchorEl(event.currentTarget);
  const handleFilterClose = () => setFilterAnchorEl(null);
  const handleSortClose = () => setSortAnchorEl(null);

  const handleAddFilter = (filter) => {
    if (!selectedFilters.includes(filter)) {
      setSelectedFilters([...selectedFilters, filter]);
    }
    handleFilterClose();
  };

  const handleRemoveFilter = (filter) => {
    setSelectedFilters(selectedFilters.filter(f => f !== filter));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Manejadores de paginación
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('sharedExpenses')}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {t('manageSharedExpenses')}
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('new')}
          >
            {t('newSharedExpense')}
          </Button>
          
          <Tooltip title={t('filter')}>
            <IconButton onClick={handleFilterClick}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={t('sort')}>
            <IconButton onClick={handleSortClick}>
              <SortIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title={t('totalSharedExpenses')}
            value={Array.isArray(expenses) ? expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0}
            type="currency"
            trend={-5.2}
            color="error"
            icon={<EuroIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title={t('activeSessions')}
            value={Array.isArray(sessions) ? sessions.length : 0}
            type="number"
            trend={2.1}
            color="info"
            icon={<GroupIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title={t('totalParticipants')}
            value={Array.isArray(sessions) ? sessions.reduce((sum, session) => sum + (session.participants || 0), 0) : 0}
            type="number"
            trend={12.5}
            color="success"
            icon={<PersonIcon />}
          />
        </Grid>
      </Grid>

      {/* Filtros seleccionados */}
      {selectedFilters.length > 0 && (
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {selectedFilters.map((filter) => (
            <Chip
              key={filter}
              label={t(filter)}
              onDelete={() => handleRemoveFilter(filter)}
              size="small"
            />
          ))}
        </Box>
      )}

      {/* Tabla de gastos */}
      <StyledCard>
        <ExpensesTable
          expenses={expenses}
          onEdit={(expense) => handleOpenDialog('edit', expense)}
          onDelete={(id) => console.log('Delete expense:', id)}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={expenses.length}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </StyledCard>

      {/* Menús de filtros y ordenamiento */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
      >
        <MenuItem onClick={() => handleAddFilter('lastWeek')}>
          <ListItemIcon>
            <CalendarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('lastWeek')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAddFilter('lastMonth')}>
          <ListItemIcon>
            <CalendarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('lastMonth')}</ListItemText>
        </MenuItem>
        {categories.map(category => (
          <MenuItem key={category} onClick={() => handleAddFilter(category)}>
            <ListItemIcon>
              <CategoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t(category)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleSortClose}
      >
        <MenuItem onClick={() => { handleSort('date'); handleSortClose(); }}>
          <ListItemText>{t('sortByDate')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleSort('amount'); handleSortClose(); }}>
          <ListItemText>{t('sortByAmount')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleSort('category'); handleSortClose(); }}>
          <ListItemText>{t('sortByCategory')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Diálogo de formulario */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'new' ? t('newSharedExpense') : t('editSharedExpense')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('amount')}
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('category')}</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    label={t('category')}
                  >
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>
                        {t(category)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('description')}
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('date')}
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('session')}</InputLabel>
                  <Select
                    name="sessionId"
                    value={formData.sessionId}
                    onChange={handleFormChange}
                    label={t('session')}
                  >
                    {sessions.map(session => (
                      <MenuItem key={session.id} value={session.id}>
                        {session.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogType === 'new' ? t('create') : t('update')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SharedExpenses; 