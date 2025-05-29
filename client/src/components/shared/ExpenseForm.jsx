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
  Slide,
  Grid,
  Paper,
  RadioGroup,
  Radio
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
  selectedYear = null,
  currentUser = null
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
    name: '',
    description: '',
    amount: '',
    category: '',
    date: getInitialDate(),
    paidBy: currentUser?.id || '',
    expenseType: 'single', // 'single', 'recurring', o 'periodic'
    periodStartDate: new Date(),
    periodEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    chargeDay: new Date().getDate() // Agregar día de cobro
  });

  const [formErrors, setFormErrors] = useState({});

  // Función para resetear el formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: '',
      category: '',
      date: getInitialDate(),
      paidBy: currentUser?.id || '',
      expenseType: 'single',
      periodStartDate: new Date(),
      periodEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      chargeDay: new Date().getDate()
    });
    setFormErrors({});
  };

  // Actualizar la fecha cuando cambia el mes/año seleccionado
  useEffect(() => {
    if (selectedMonth !== null && selectedYear !== null && !initialData) {
      const newDate = new Date(formData.date);
      newDate.setMonth(selectedMonth);
      newDate.setFullYear(selectedYear);
      
      setFormData(prev => ({
        ...prev,
        date: newDate,
        periodStartDate: newDate,
        periodEndDate: newDate
      }));
    }
  }, [selectedMonth, selectedYear, initialData]);

  useEffect(() => {
    // Actualizar paidBy cuando cambie el currentUser
    if (currentUser?.id && !formData.paidBy) {
      setFormData(prev => ({
        ...prev,
        paidBy: currentUser.id
      }));
    }
  }, [currentUser]);

  // Efecto para cargar datos iniciales cuando se abre el formulario
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        amount: initialData.amount || '',
        category: initialData.category || '',
        date: initialData.date ? new Date(initialData.date) : getInitialDate(),
        paidBy: initialData.paidBy || currentUser?.id || '',
        expenseType: initialData.expenseType || 'single',
        periodStartDate: initialData.periodStartDate ? new Date(initialData.periodStartDate) : new Date(),
        periodEndDate: initialData.periodEndDate ? new Date(initialData.periodEndDate) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
        chargeDay: initialData.chargeDay || new Date().getDate()
      });
    } else {
      resetForm();
    }
  }, [initialData, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExpenseTypeChange = (e) => {
    const newType = e.target.value;
    setFormData(prev => ({
      ...prev,
      expenseType: newType,
      // Si cambia a periódico, establecer fechas por defecto
      periodStartDate: newType === 'periodic' ? new Date() : null,
      periodEndDate: newType === 'periodic' ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : null
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
      errors.amount = 'El monto es requerido y debe ser un número';
    }

    if (!formData.category) {
      errors.category = 'La categoría es requerida';
    }

    if (!formData.name) {
      errors.name = 'El nombre es requerido';
    }

    if (formData.expenseType === 'periodic') {
      if (!formData.periodStartDate) {
        errors.periodStartDate = 'La fecha de inicio es requerida';
      }
      if (!formData.periodEndDate) {
        errors.periodEndDate = 'La fecha de fin es requerida';
      }
      if (formData.periodStartDate && formData.periodEndDate && 
          formData.periodStartDate > formData.periodEndDate) {
        errors.periodEndDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    if (formData.expenseType === 'recurring') {
      if (!formData.chargeDay || formData.chargeDay < 1 || formData.chargeDay > 31) {
        errors.chargeDay = 'El día de cobro debe estar entre 1 y 31';
      }
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
        console.error('Error al procesar el monto:', error);
        setFormErrors(prev => ({
          ...prev,
          amount: 'Error al procesar el monto'
        }));
        return;
      }

      const expenseData = {
        ...formData,
        amount,
        date: validDate,
        isPeriodic: formData.expenseType === 'periodic',
        isRecurring: formData.expenseType === 'recurring',
        // Solo incluir el día de cobro si es un gasto recurrente
        chargeDay: formData.expenseType === 'recurring' ? parseInt(formData.chargeDay) : undefined
      };

      onSubmit(expenseData);
      resetForm();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={Slide}
      PaperProps={{
        elevation: isMobile ? 0 : 3,
        sx: {
          borderRadius: isMobile ? '16px 16px 0 0' : 2,
          height: isMobile ? '90vh' : 'auto',
          m: isMobile ? '10vh 0 0 0' : 2,
          position: isMobile ? 'fixed' : 'static',
          bottom: 0,
          maxHeight: isMobile ? '90vh' : '95vh',
          overflow: 'auto'
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

            {/* Tipo de gasto */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: alpha(theme.palette.info.main, 0.05),
                borderRadius: 2
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Tipo de gasto especial
              </Typography>
              <RadioGroup
                name="expenseType"
                value={formData.expenseType}
                onChange={handleExpenseTypeChange}
              >
                <FormControlLabel 
                  value="recurring" 
                  control={<Radio color="info" />} 
                  label="Gasto recurrente" 
                />
                <FormControlLabel 
                  value="periodic" 
                  control={<Radio color="info" />} 
                  label="Gasto por período" 
                />
              </RadioGroup>
            </Paper>

            {/* Fecha para gasto puntual o recurrente */}
            {formData.expenseType === 'single' && (
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
            )}

            {/* Campo de día de cobro para gastos recurrentes */}
            {formData.expenseType === 'recurring' && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Día de cobro mensual
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  name="chargeDay"
                  value={formData.chargeDay}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: 31 }}
                  placeholder="Día del mes (1-31)"
                  error={!!formErrors.chargeDay}
                  helperText={formErrors.chargeDay}
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
            )}

            {/* Fechas para gasto por período */}
            {formData.expenseType === 'periodic' && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Fecha de inicio
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      value={formData.periodStartDate}
                      onChange={(newDate) => {
                        setFormData(prev => ({
                          ...prev,
                          periodStartDate: newDate
                        }));
                      }}
                      disabled={loading}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!formErrors.periodStartDate,
                          helperText: formErrors.periodStartDate,
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
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Fecha de fin
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      value={formData.periodEndDate}
                      onChange={(newDate) => {
                        setFormData(prev => ({
                          ...prev,
                          periodEndDate: newDate
                        }));
                      }}
                      disabled={loading}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!formErrors.periodEndDate,
                          helperText: formErrors.periodEndDate,
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
                </Grid>
              </Grid>
            )}

            {/* Descripción */}
            <TextField
              fullWidth
              multiline
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descripción (opcional)"
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions 
        sx={{ 
          px: isMobile ? 2 : 3, 
          pb: isMobile ? 2 : 3,
          gap: 1
        }}
      >
        <Button 
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          variant="contained"
          sx={{ borderRadius: 2 }}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Guardar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseForm;

