import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import { validateEmail } from '../../utils/helpers';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const SessionForm = ({
  open,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    participants: initialData?.participants || [],
    sessionType: initialData?.sessionType || 'single'
  });
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [emailError, setEmailError] = useState('');

  const SESSION_TYPES = [
    { value: 'single', label: 'Sesión Única (puntual)' },
    { value: 'permanent', label: 'Sesión Permanente (mensual)' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddParticipant = (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail) {
      setEmailError('El email es requerido');
      return;
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      setEmailError('Email inválido');
      return;
    }
    
    if (formData.participants.some(p => p.email.toLowerCase() === normalizedEmail)) {
      setEmailError('Este email ya ha sido agregado');
      return;
    }

    // Buscar si el usuario ya existe en el sistema
    fetch(`/api/users/by-email/${encodeURIComponent(normalizedEmail)}`)
      .then(res => res.json())
      .then(data => {
        const participant = {
          email: normalizedEmail,
          canEdit: Boolean(canEdit),
          canDelete: Boolean(canDelete),
          name: data.user ? data.user.name : null
        };

        setFormData(prev => ({
          ...prev,
          participants: [...prev.participants, participant]
        }));
        setEmail('');
        setCanEdit(false);
        setCanDelete(false);
        setEmailError('');
      })
      .catch(() => {
        // Si no se encuentra el usuario, agregarlo solo con el email
        const participant = {
          email: normalizedEmail,
          canEdit: Boolean(canEdit),
          canDelete: Boolean(canDelete)
        };

        setFormData(prev => ({
          ...prev,
          participants: [...prev.participants, participant]
        }));
        setEmail('');
        setCanEdit(false);
        setCanDelete(false);
        setEmailError('');
      });
  };

  const handleRemoveParticipant = (emailToRemove) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.email !== emailToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    // Validar que todos los participantes tengan permisos definidos como booleanos
    const validatedFormData = {
      ...formData,
      participants: formData.participants.map(participant => ({
        ...participant,
        canEdit: Boolean(participant.canEdit),
        canDelete: Boolean(participant.canDelete),
        email: participant.email.trim().toLowerCase() // Normalizar emails
      }))
    };

    // Validación adicional de datos
    if (validatedFormData.participants.some(p => !p.email)) {
      console.error('Todos los participantes deben tener un email válido');
      return;
    }

    console.log('Enviando datos de sesión:', JSON.stringify(validatedFormData, null, 2));
    onSubmit(validatedFormData);
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
          {initialData ? 'Editar Sesión' : 'Nueva Sesión'}
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Nombre de la sesión"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />

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
            sx={{ mb: 3 }}
          />

          <FormControl fullWidth margin="dense" sx={{ mb: 3 }}>
            <InputLabel id="session-type-label">Tipo de Sesión</InputLabel>
            <Select
              labelId="session-type-label"
              name="sessionType"
              value={formData.sessionType}
              label="Tipo de Sesión"
              onChange={handleChange}
            >
              {SESSION_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {formData.sessionType === 'permanent' 
                ? 'Sesión con historial mensual, como gastos recurrentes del hogar' 
                : 'Sesión para un evento puntual, como un viaje o una cena'}
            </FormHelperText>
          </FormControl>

          <Typography variant="subtitle2" gutterBottom>
            Participantes
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                <TextField
                  label="Email del participante"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  error={!!emailError}
                  helperText={emailError}
                  size="small"
                  fullWidth
                />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Tooltip title="Permite al participante editar detalles de la sesión">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={canEdit}
                          onChange={(e) => setCanEdit(e.target.checked)}
                          icon={<EditIcon color="disabled" />}
                          checkedIcon={<EditIcon color="primary" />}
                        />
                      }
                      label="Puede editar"
                    />
                  </Tooltip>
                  <Tooltip title="Permite al participante eliminar elementos de la sesión">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={canDelete}
                          onChange={(e) => setCanDelete(e.target.checked)}
                          icon={<DeleteIcon color="disabled" />}
                          checkedIcon={<DeleteIcon color="error" />}
                        />
                      }
                      label="Puede eliminar"
                    />
                  </Tooltip>
                  <Button
                    variant="contained"
                    onClick={handleAddParticipant}
                    size="small"
                  >
                    Agregar
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {formData.participants.map((participant) => (
              <Chip
                key={participant.email}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{participant.name || participant.email}</span>
                    {participant.canEdit && (
                      <Tooltip title="Puede editar">
                        <EditIcon fontSize="small" color="action" />
                      </Tooltip>
                    )}
                    {participant.canDelete && (
                      <Tooltip title="Puede eliminar">
                        <DeleteIcon fontSize="small" color="action" />
                      </Tooltip>
                    )}
                  </Box>
                }
                onDelete={() => handleRemoveParticipant(participant.email)}
                sx={{
                  '& .MuiChip-label': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }
                }}
              />
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={loading || !formData.name.trim()}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : initialData ? 'Guardar Cambios' : 'Crear Sesión'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SessionForm;
