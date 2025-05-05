import React, { useState } from 'react';
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
  Divider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';
import CloseIcon from '@mui/icons-material/Close';

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
  error = null
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    amount: initialData?.amount || '',
    category: initialData?.category || '',
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    description: initialData?.description || '',
    isRecurring: initialData?.isRecurring || false
  });

  const [formErrors, setFormErrors] = useState({});
  const [showRecurringInfo, setShowRecurringInfo] = useState(formData.isRecurring);

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
      onSubmit({
        ...formData,
        amount: Number(formData.amount)
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
        sx: { 
          borderRadius: isMobile ? 0 : 2,
          height: isMobile ? '100%' : 'auto',
          m: isMobile ? 0 : 2,
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            pb: 1,
            pt: { xs: 2, sm: 2.5 },
            px: { xs: 2, sm: 3 },
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            {initialData ? 'Editar Gasto' : 'Nuevo Gasto'}
          </Typography>
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <Divider />

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                borderRadius: 1,
                fontSize: { xs: '0.8rem', sm: '0.875rem' } 
              }}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: { xs: 1, sm: 2 }, 
            mb: { xs: 1, sm: 2 } 
          }}>
            <TextField
              autoComplete="off"
              label="Nombre"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              margin="normal"
              variant="outlined"
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
              sx={{ flex: 2, my: { xs: 0.5, sm: 1 } }}
              InputProps={{
                sx: { fontSize: { xs: '0.9rem', sm: '1rem' } }
              }}
              InputLabelProps={{
                sx: { fontSize: { xs: '0.9rem', sm: '1rem' } }
              }}
            />

            <TextField
              margin="dense"
              name="amount"
              label="Monto"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              error={!!formErrors.amount}
              helperText={formErrors.amount}
              InputProps={{
                inputProps: { min: 0, step: "0.01" },
                sx: { fontSize: { xs: '0.9rem', sm: '1rem' } }
              }}
              InputLabelProps={{
                sx: { fontSize: { xs: '0.9rem', sm: '1rem' } }
              }}
              sx={{ flex: 1, my: { xs: 0.5, sm: 1 } }}
            />
          </Box>

          <Box sx={{ mb: { xs: 1, sm: 2 } }}>
            <FormControl 
              fullWidth 
              error={!!formErrors.category}
              sx={{ my: { xs: 0.5, sm: 1 } }}
            >
              <InputLabel sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Categoría</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                label="Categoría"
                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                {EXPENSE_CATEGORIES.map(category => (
                  <MenuItem 
                    key={category} 
                    value={category}
                    sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                  >
                    {category}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.category && (
                <FormHelperText sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                  {formErrors.category}
                </FormHelperText>
              )}
            </FormControl>
          </Box>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DatePicker
              label="Fecha"
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
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  error={!!formErrors.date}
                  helperText={formErrors.date}
                  sx={{ 
                    mb: { xs: 1, sm: 2 },
                    my: { xs: 0.5, sm: 1 },
                    '.MuiInputLabel-root': { fontSize: { xs: '0.9rem', sm: '1rem' } },
                    '.MuiInputBase-root': { fontSize: { xs: '0.9rem', sm: '1rem' } }
                  }}
                />
              )}
            />
          </LocalizationProvider>

          <TextField
            multiline
            rows={3}
            margin="dense"
            name="description"
            label="Descripción (opcional)"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            InputProps={{
              sx: { fontSize: { xs: '0.9rem', sm: '1rem' } }
            }}
            InputLabelProps={{
              sx: { fontSize: { xs: '0.9rem', sm: '1rem' } }
            }}
            sx={{ my: { xs: 0.5, sm: 1 } }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isRecurring}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    isRecurring: e.target.checked
                  });
                  setShowRecurringInfo(e.target.checked);
                }}
                color="primary"
              />
            }
            label={
              <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Es un gasto recurrente
              </Typography>
            }
            sx={{ mt: { xs: 1, sm: 2 } }}
          />

          {showRecurringInfo && (
            <Alert 
              severity="info" 
              sx={{ 
                mt: 1, 
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                borderRadius: 1
              }}
            >
              Los gastos recurrentes se repiten automáticamente cada mes el día {getDayFromDate(formData.date)}.
            </Alert>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, justifyContent: 'space-between' }}>
          <Button 
            onClick={onClose} 
            color="inherit"
            sx={{ 
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              px: { xs: 2, sm: 3 }
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ 
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              px: { xs: 2, sm: 3 },
              minWidth: { xs: 90, sm: 100 }
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
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseForm;
