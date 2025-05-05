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
  Checkbox
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';

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
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Editar Gasto' : 'Nuevo Gasto'}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
              sx={{ flex: 2 }}
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
                inputProps: { min: 0, step: "0.01" }
              }}
              sx={{ flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth error={!!formErrors.category}>
              <InputLabel>Categoría</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                label="Categoría"
              >
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
                  sx={{ mb: 2 }}
                />
              )}
            />
          </LocalizationProvider>

          <TextField
            margin="dense"
            name="description"
            label="Descripción (opcional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={handleChange}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isRecurring}
                onChange={(e) => {
                  const isRecurring = e.target.checked;
                  setShowRecurringInfo(isRecurring);
                  
                  const recurringDay = isRecurring ? getDayFromDate(formData.date) : null;
                  
                  setFormData(prev => ({
                    ...prev,
                    isRecurring,
                    recurringDay
                  }));
                }}
                name="isRecurring"
              />
            }
            label="Gasto Recurrente (se repetirá mensualmente)"
          />

          {showRecurringInfo && (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              Este gasto se repetirá el día {getDayFromDate(formData.date)} de cada mes.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : initialData ? 'Guardar Cambios' : 'Crear Gasto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseForm;
