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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  FormHelperText
} from '@mui/material';
import { validateEmail } from '../../utils/helpers';
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

    const participant = {
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: 'member',
      status: 'pending'
    };

    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, participant]
    }));
    setEmail('');
    setEmailError('');
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

    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Editar Sesión' : 'Nueva Sesión'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Nombre de la sesión"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                error={!formData.name.trim()}
                helperText={!formData.name.trim() ? 'El nombre es requerido' : ''}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Descripción"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="session-type-label">Tipo de sesión</InputLabel>
                <Select
                  labelId="session-type-label"
                  name="sessionType"
                  value={formData.sessionType}
                  onChange={handleChange}
                  label="Tipo de sesión"
                >
                  {SESSION_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Participantes
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Email del participante"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  error={!!emailError}
                  helperText={emailError}
                  fullWidth
                  sx={{ mb: 1 }}
                />
                
                <Button
                  variant="contained"
                  onClick={handleAddParticipant}
                  fullWidth
                >
                  Agregar Participante
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.participants.map((participant, index) => (
                  <Chip
                    key={index}
                    label={participant.email}
                    onDelete={() => handleRemoveParticipant(participant.email)}
                    deleteIcon={<DeleteIcon />}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formData.name.trim()}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SessionForm;
