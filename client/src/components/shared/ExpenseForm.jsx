import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  CircularProgress,
  Box,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
  useTheme,
  IconButton,
  Typography,
  Divider,
  InputAdornment
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';
import CloseIcon from '@mui/icons-material/Close';
import EuroIcon from '@mui/icons-material/Euro';

const EXPENSE_CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Ropa',
  'Otros'
];

const ExpenseForm = ({
  open,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
  error = null,
  selectedMonth = null,
  selectedYear = null
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Crear fecha inicial basada en el mes/año seleccionado si se proporciona
  const getInitialDate = () => {
    if (initialData?.date) {
      return new Date(initialData.date);
    } 
    
    if (selectedMonth !== null && selectedYear !== null) {
      // Si se proporciona mes/año, crear fecha con esos valores
      const newDate = new Date();
      newDate.setMonth(selectedMonth);
      newDate.setFullYear(selectedYear);
      return newDate;
    }
    
    return new Date();
  };
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    amount: initialData?.amount || '',
    category: initialData?.category || '',
    date: getInitialDate(),
    description: initialData?.description || '',
    isRecurring: initialData?.isRecurring || false
  });

  const [formErrors, setFormErrors] = useState({});
  const [showRecurringInfo, setShowRecurringInfo] = useState(formData.isRecurring);

  // Actualizar la fecha cuando cambia el mes/año seleccionado
  useEffect(() => {
    if (selectedMonth !== null && selectedYear !== null && !initialData) {
      const newDate = new Date(formData.date);
      newDate.setMonth(selectedMonth);
      newDate.setFullYear(selectedYear);
      
      setFormData(prev => ({
        ...prev,
        date: newDate
      }));
    }
  }, [selectedMonth, selectedYear, initialData]);

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'El monto debe ser mayor a 0';
    }
    if (!formData.category) {
      errors.category = 'La categoría es requerida';
    }
    if (!formData.date) {
      errors.date = 'La fecha es requerida';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      let validDate = formData.date;
      if (!(validDate instanceof Date) || isNaN(validDate.getTime())) {
        validDate = new Date();
      }

      onSubmit({
        ...formData,
        amount: Number(formData.amount),
        date: validDate.toISOString()
      });
    }
  };

  const getDayFromDate = (date) => {
    const dateObj = new Date(date);
    return dateObj.getDate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        elevation: 3,
        sx: {
          borderRadius: isMobile ? 0 : 2,
          height: isMobile ? '100%' : 'auto',
          m: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100vh' : '95vh',
          overflow: 'auto'
        }
      }}
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Cabecera del formulario */}
        <Box 
          sx={{ 
            px: 3, 
            py: 2.5, 
            borderBottom: 1, 
            borderColor: 'divider',
            backgroundColor: theme => alpha(theme.palette.primary.main, 0.05),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <Typography variant="h6" fontWeight="medium">
            {initialData ? 'Editar Gasto' : 'Nuevo Gasto'}
          </Typography>
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Contenido del formulario */}
        <Box sx={{ 
          p: 3, 
          flexGrow: 1, 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 1,
                fontSize: '0.9rem'
              }}
            >
              {error}
            </Alert>
          )}

          {/* Nombre y Monto */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              component="label" 
              htmlFor="name" 
              sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
            >
              Nombre
            </Typography>
            <TextField
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
              placeholder="Nombre del gasto"
              variant="outlined"
              InputProps={{
                sx: { py: 1.5, backgroundColor: 'background.paper' }
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              component="label" 
              htmlFor="amount" 
              sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
            >
              Importe
            </Typography>
            <TextField
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              type="number"
              fullWidth
              required
              error={!!formErrors.amount}
              helperText={formErrors.amount}
              placeholder="0.00"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EuroIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                inputProps: { min: 0, step: "0.01" },
                sx: { py: 1.5, backgroundColor: 'background.paper' }
              }}
            />
          </Box>

          {/* Categoría */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              component="label" 
              htmlFor="category" 
              sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
            >
              Categoría
            </Typography>
            <FormControl
              fullWidth
              error={!!formErrors.category}
              variant="outlined"
            >
              <Select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                displayEmpty
                sx={{
                  backgroundColor: 'background.paper',
                  '& .MuiSelect-select': { py: 1.5 }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: { maxHeight: 300, borderRadius: 1 }
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                  sx: { zIndex: 9999 }
                }}
                renderValue={(selected) => {
                  if (!selected) {
                    return <Typography color="text.secondary">Seleccionar categoría</Typography>;
                  }
                  return selected;
                }}
              >
                {EXPENSE_CATEGORIES.map(category => (
                  <MenuItem
                    key={category}
                    value={category}
                  >
                    {category}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.category && (
                <FormHelperText>
                  {formErrors.category}
                </FormHelperText>
              )}
            </FormControl>
          </Box>

          {/* Fecha */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              component="label" 
              htmlFor="date" 
              sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
            >
              Fecha
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                value={formData.date}
                onChange={(newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    date: newValue
                  }));
                  setFormErrors(prev => ({
                    ...prev,
                    date: ''
                  }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                    error: !!formErrors.date,
                    helperText: formErrors.date || 'Se guardará como gasto del mes ' + 
                      format(formData.date, 'MMMM yyyy', { locale: es }),
                    InputProps: {
                      sx: { py: 1.5, backgroundColor: 'background.paper' }
                    }
                  },
                  popper: {
                    sx: { zIndex: 9999 }
                  }
                }}
              />
            </LocalizationProvider>
          </Box>

          {/* Descripción */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle2" 
              component="label" 
              htmlFor="description" 
              sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
            >
              Descripción (opcional)
            </Typography>
            <TextField
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Detalles adicionales del gasto"
              variant="outlined"
              InputProps={{
                sx: { backgroundColor: 'background.paper' }
              }}
            />
          </Box>

          {/* Recurrente */}
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isRecurring}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      isRecurring: e.target.checked
                    }));
                    setShowRecurringInfo(e.target.checked);
                  }}
                  color="primary"
                />
              }
              label={
                <Typography>
                  Es un {formData.type === 'income' ? 'ingreso' : 'gasto'} recurrente
                </Typography>
              }
            />
          </Box>

          {showRecurringInfo && (
            <Alert
              severity="info"
              sx={{
                borderRadius: 1
              }}
            >
              Los {formData.type === 'income' ? 'ingresos' : 'gastos'} recurrentes se repiten automáticamente cada mes el día {getDayFromDate(formData.date)}.
            </Alert>
          )}
        </Box>

        {/* Botones de acción */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: 3,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: theme => alpha(theme.palette.background.default, 0.5),
            position: 'sticky',
            bottom: 0,
            zIndex: 10
          }}
        >
          <Button
            onClick={onClose}
            sx={{ 
              py: 1.5, 
              px: 3, 
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.95rem'
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ 
              py: 1.5, 
              px: 4, 
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 'medium'
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : initialData ? (
              'Actualizar'
            ) : (
              'Guardar'
            )}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default ExpenseForm;
