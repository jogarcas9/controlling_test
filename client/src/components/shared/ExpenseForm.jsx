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
  InputAdornment,
  Slide
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validación específica para el campo amount
    if (name === 'amount') {
      // Permitir números, un punto o coma decimal
      const regex = /^\d*[.,]?\d{0,2}$/;
      
      if (value === '' || regex.test(value)) {
        // Almacenar el valor tal cual se ingresa
        setFormData(prev => ({
          ...prev,
          amount: value
        }));
        setFormErrors(prev => ({
          ...prev,
          amount: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }

    // Validar el monto - Mejorada la validación
    try {
      // Primero reemplazar la coma por punto si existe
      const amountStr = formData.amount.toString().replace(',', '.');
      const numericAmount = parseFloat(amountStr);
      
      if (!formData.amount) {
        errors.amount = 'El monto es requerido';
      } else if (isNaN(numericAmount)) {
        errors.amount = 'El monto debe ser un número válido';
      } else if (numericAmount <= 0) {
        errors.amount = 'El monto debe ser mayor a 0';
      }
    } catch (error) {
      errors.amount = 'El monto debe ser un número válido';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      let validDate = formData.date;
      if (!(validDate instanceof Date) || isNaN(validDate.getTime())) {
        validDate = new Date();
      }

      // Procesar el monto antes de enviarlo
      let amount;
      try {
        // Primero reemplazar la coma por punto si existe
        const amountStr = formData.amount.toString().replace(',', '.');
        // Convertir a número
        amount = parseFloat(amountStr);
        
        if (isNaN(amount)) {
          setFormErrors(prev => ({
            ...prev,
            amount: 'El monto debe ser un número válido'
          }));
          return;
        }
        
        // Fijar a 2 decimales y convertir de nuevo a número
        amount = Number(amount.toFixed(2));
      } catch (error) {
        console.error('Error procesando el monto:', error);
        setFormErrors(prev => ({
          ...prev,
          amount: 'El monto debe ser un número válido'
        }));
        return;
      }

      // Asegurar que todos los campos requeridos están presentes y formateados
      const expenseData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        amount: amount,
        category: formData.category?.trim() || 'Otros',
        date: validDate.toISOString(),
        isRecurring: !!formData.isRecurring
      };

      console.log('=== DATOS DEL FORMULARIO ===');
      console.log('formData original:', formData);
      console.log('Monto original:', formData.amount);
      console.log('Monto procesado:', amount);
      console.log('Tipo de monto procesado:', typeof amount);
      console.log('Datos finales a enviar:', expenseData);

      onSubmit(expenseData);
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
      TransitionComponent={Slide}
      sx={{
        '& .MuiDialog-paper': {
          zIndex: theme.zIndex.modal
        }
      }}
      PaperProps={{
        elevation: isMobile ? 0 : 3,
        sx: {
          borderRadius: isMobile ? '16px 16px 0 0' : 2,
          height: isMobile ? '90vh' : 'auto',
          m: isMobile ? '10vh 0 0 0' : 2,
          position: isMobile ? 'fixed' : 'static',
          bottom: 0,
          maxHeight: isMobile ? '90vh' : '95vh',
          overflow: 'auto',
          bgcolor: theme.palette.background.paper
        }
      }}
    >
      <Box 
        sx={{ 
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: alpha(theme.palette.info.main, 0.1),
          borderRadius: isMobile ? '16px 16px 0 0' : '4px 4px 0 0'
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 2,
            color: theme.palette.info.main
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              {initialData ? 'Editar Gasto' : 'Nuevo Gasto'}
            </Typography>
          </Box>
          <IconButton
            edge="end"
            onClick={onClose}
            sx={{
              color: theme.palette.info.main
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      </Box>

      <DialogContent sx={{ p: isMobile ? 2 : 3, pt: isMobile ? 3 : 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Monto */}
            <TextField
              fullWidth
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Importe *"
              error={!!formErrors.amount}
              helperText={formErrors.amount}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EuroIcon color="info" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            />

            {/* Categoría */}
            <FormControl 
              fullWidth 
              error={!!formErrors.category}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            >
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                displayEmpty
                disabled={loading}
                renderValue={selected => selected || "Categoría *"}
              >
                <MenuItem value="" disabled>
                  <em>Categoría *</em>
                </MenuItem>
                {EXPENSE_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.category && (
                <FormHelperText>{formErrors.category}</FormHelperText>
              )}
            </FormControl>

            {/* Nombre */}
            <TextField
              fullWidth
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nombre del gasto *"
              error={!!formErrors.name}
              helperText={formErrors.name}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            />

            {/* Fecha */}
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                value={formData.date}
                onChange={(newDate) => {
                  setFormData(prev => ({
                    ...prev,
                    date: newDate
                  }));
                }}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!formErrors.date,
                    helperText: formErrors.date,
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                        borderRadius: 2
                      }
                    }
                  }
                }}
              />
            </LocalizationProvider>

            {/* Gasto Recurrente */}
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: alpha(theme.palette.info.main, 0.05),
                borderRadius: 2
              }}
            >
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
                    disabled={loading}
                    color="info"
                  />
                }
                label="¿Es un gasto recurrente?"
              />
            </Box>

            {/* Descripción */}
            <TextField
              fullWidth
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descripción (opcional)"
              multiline
              rows={3}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions 
        sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          bottom: 0,
          zIndex: 1
        }}
      >
        <Button 
          onClick={onClose}
          disabled={loading}
          sx={{
            borderRadius: 2,
            px: 3
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="info"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            borderRadius: 2,
            px: 3
          }}
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseForm;
