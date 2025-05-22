import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  IconButton,
  Box,
  Paper,
  Slide
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { EuroIcon, CloseIcon, AttachMoneyOutlined } from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { Alert } from '@mui/material';
import { CircularProgress } from '@mui/material';

const INCOME_CATEGORIES = [
  'Salario',
  'Freelance',
  'Inversiones',
  'Otros'
];

const IncomeForm = ({
  open,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
  error = null
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    amount: initialData?.amount || '',
    category: initialData?.category || '',
    date: initialData?.date || new Date(),
    isRecurring: initialData?.isRecurring || false
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    amount: '',
    category: '',
    date: '',
    isRecurring: ''
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: newValue });
    // Limpiar error cuando el usuario modifica el campo
    setFormErrors({ ...formErrors, [name]: '' });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'El nombre es requerido';
    if (!formData.amount) errors.amount = 'El importe es requerido';
    if (!formData.category) errors.category = 'La categoría es requerida';
    if (!formData.date) errors.date = 'La fecha es requerida';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
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
      TransitionProps={{ direction: "up" }}
      PaperProps={{
        elevation: isMobile ? 0 : 3,
        sx: {
          borderRadius: isMobile ? '16px' : 2,
          height: 'auto',
          m: '16px',
          maxHeight: isMobile ? '90vh' : '95vh',
          overflow: 'auto',
          position: 'fixed',
          bottom: isMobile ? '10%' : 'auto',
          left: 0,
          right: 0,
          width: 'calc(100% - 32px)',
          mx: 'auto'
        }
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'center'
        }
      }}
    >
      <Paper 
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: theme.palette.success.main,
          color: 'white',
          borderRadius: '16px 16px 0 0'
        }}
      >
        <DialogTitle
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachMoneyOutlined sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              {initialData ? 'Editar Ingreso' : 'Nuevo Ingreso'}
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      </Paper>

      <DialogContent
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
          overflowX: 'hidden',
          '& .MuiTextField-root, & .MuiFormControl-root': {
            mb: 1.5
          }
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre del ingreso"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!formErrors.name}
              helperText={formErrors.name}
              disabled={loading}
              required
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Importe"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              error={!!formErrors.amount}
              helperText={formErrors.amount}
              disabled={loading}
              required
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EuroIcon fontSize="small" color="success" />
                  </InputAdornment>
                ),
                inputProps: { 
                  min: 0,
                  step: "0.01",
                  inputMode: 'decimal',
                  pattern: '[0-9]*'
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl 
              fullWidth 
              error={!!formErrors.category} 
              required
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper
                }
              }}
            >
              <InputLabel>Categoría</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
                label="Categoría"
                disabled={loading}
              >
                {INCOME_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.category && (
                <FormHelperText>{formErrors.category}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha"
                value={formData.date}
                onChange={(newValue) => {
                  handleChange({
                    target: { name: 'date', value: newValue }
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    error={!!formErrors.date}
                    helperText={formErrors.date}
                    disabled={loading}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        backgroundColor: theme.palette.background.paper
                      }
                    }}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: 'background.paper'
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isRecurring}
                    onChange={handleChange}
                    name="isRecurring"
                    disabled={loading}
                    color="success"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    Es un ingreso recurrente
                  </Typography>
                }
              />
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          bottom: 0,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          zIndex: 1,
          borderRadius: '0 0 16px 16px'
        }}
      >
        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            py: 1,
            gap: 1
          }}
        >
          <Button
            onClick={onClose}
            disabled={loading}
            fullWidth={isMobile}
            variant="outlined"
            color="inherit"
            size="small"
            sx={{ 
              borderRadius: 1,
              py: 0.75
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={loading}
            fullWidth={isMobile}
            size="small"
            sx={{ 
              borderRadius: 1,
              py: 0.75
            }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {initialData ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogActions>
      </Paper>
    </Dialog>
  );
};

export default IncomeForm; 