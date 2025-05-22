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
  Alert,
  CircularProgress,
  Grid,
  Typography,
  IconButton,
  InputAdornment,
  useMediaQuery,
  Slide,
  FormControlLabel,
  Checkbox,
  FormHelperText
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { es } from 'date-fns/locale';
import { Euro as EuroIcon, Close as CloseIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

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

const SharedExpenseForm = ({ open, onClose, onSubmit, initialValues, isEditing, sessionId, currentSession }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const validationSchema = Yup.object({
    name: Yup.string()
      .required('El nombre es requerido')
      .min(3, 'El nombre debe tener al menos 3 caracteres'),
    description: Yup.string()
      .min(3, 'La descripción debe tener al menos 3 caracteres'),
    amount: Yup.number()
      .required('El monto es requerido')
      .positive('El monto debe ser positivo'),
    category: Yup.string()
      .required('La categoría es requerida'),
    date: Yup.date()
      .required('La fecha es requerida')
      .max(new Date(), 'La fecha no puede ser futura'),
    isRecurring: Yup.boolean()
  });

  const formik = useFormik({
    initialValues: initialValues || {
      name: '',
      description: '',
      amount: '',
      category: '',
      date: new Date(),
      isRecurring: false
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);

        if (!sessionId) {
          throw new Error('No se ha especificado una sesión');
        }

        const formattedValues = {
          ...values,
          amount: parseFloat(values.amount),
          sessionId: sessionId,
          isRecurring: values.isRecurring
        };

        await onSubmit(formattedValues);
        formik.resetForm();
        onClose();
      } catch (err) {
        setError(err.message || 'Error al guardar el gasto');
        console.error('Error en el formulario:', err);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={isMobile ? Slide : undefined}
      TransitionProps={isMobile ? { direction: "up" } : undefined}
      PaperProps={{
        elevation: 3,
        sx: {
          borderRadius: '16px',
          width: '90%',
          maxWidth: '400px',
          mx: 'auto',
          my: '10vh',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1300,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'center'
        },
        '& .MuiBackdrop-root': {
          zIndex: 1200,
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2,
          bgcolor: theme.palette.primary.main,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}
      >
        <Typography variant="h6" component="div" sx={{ 
          fontSize: '1.1rem',
          fontWeight: 500
        }}>
          {isEditing ? 'Editar Gasto Compartido' : 'Nuevo Gasto Compartido'}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          sx={{ color: 'white' }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {error && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit} style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        width: '100%'
      }}>
        <DialogContent
          sx={{
            px: 3,
            py: 3,
            overflowY: 'auto',
            overflowX: 'hidden',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            '& .MuiGrid-container': {
              margin: 0,
              width: '100%'
            },
            '& .MuiGrid-item': {
              width: '100%',
              maxWidth: '100%',
              flexBasis: '100%',
              paddingLeft: 0,
              paddingRight: 0
            },
            '& .MuiTextField-root, & .MuiFormControl-root': {
              mb: 3,
              width: '100%',
              maxWidth: '100%'
            },
            '& .MuiInputLabel-root': {
              backgroundColor: 'transparent',
              fontSize: '0.9rem',
              position: 'static',
              marginBottom: '12px',
              color: theme.palette.text.primary,
              transform: 'none',
              display: 'block'
            },
            '& .MuiInputLabel-asterisk': {
              color: theme.palette.error.main
            },
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.background.paper,
              fontSize: '0.9rem',
              borderRadius: '8px',
              width: '100%',
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.15)'
              },
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main
              }
            },
            '& .MuiOutlinedInput-input': {
              padding: '10px 14px'
            }
          }}
        >
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                disabled={loading}
                required
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={formik.touched.description && formik.errors.description}
                disabled={loading}
                size="small"
                multiline
                rows={2}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
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
                value={formik.values.amount}
                onChange={formik.handleChange}
                error={formik.touched.amount && Boolean(formik.errors.amount)}
                helperText={formik.touched.amount && formik.errors.amount}
                disabled={loading}
                required
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EuroIcon fontSize="small" color="primary" />
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
                    borderRadius: 1
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl 
                fullWidth 
                error={formik.touched.category && Boolean(formik.errors.category)}
                required
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1
                  }
                }}
              >
                <InputLabel>Categoría</InputLabel>
                <Select
                  name="category"
                  value={formik.values.category}
                  onChange={formik.handleChange}
                  label="Categoría"
                  disabled={loading}
                >
                  {EXPENSE_CATEGORIES.map(category => (
                    <MenuItem key={category} value={category.toLowerCase()}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha"
                  value={formik.values.date}
                  onChange={(newValue) => {
                    formik.setFieldValue('date', newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      required
                      error={formik.touched.date && Boolean(formik.errors.date)}
                      helperText={formik.touched.date && formik.errors.date}
                      disabled={loading}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1
                        }
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="isRecurring"
                    checked={formik.values.isRecurring}
                    onChange={formik.handleChange}
                    disabled={loading}
                    color="primary"
                  />
                }
                label="Gasto recurrente mensual"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.9rem',
                    color: theme.palette.text.secondary
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            gap: 1,
            bgcolor: 'background.paper',
            position: 'sticky',
            bottom: 0,
            zIndex: 1,
            '& .MuiButton-root': {
              flex: 1,
              borderRadius: '8px',
              fontSize: '0.9rem',
              textTransform: 'none',
              py: 1
            }
          }}
        >
          <Button
            onClick={onClose}
            size="small"
            variant="outlined"
            sx={{
              color: theme.palette.text.secondary,
              borderColor: 'rgba(0, 0, 0, 0.15)'
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={loading}
            sx={{
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none'
              }
            }}
          >
            {loading ? <CircularProgress size={20} /> : (isEditing ? 'Guardar' : 'Crear')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SharedExpenseForm; 