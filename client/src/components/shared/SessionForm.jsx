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
  Tooltip,
  useTheme,
  useMediaQuery,
  IconButton,
  Slide,
  alpha
} from '@mui/material';
import { validateEmail } from '../../utils/helpers';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import * as sharedSessionService from '../../services/sharedSessionService';

const SessionForm = ({
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

  const handleAddParticipant = async (e) => {
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

    try {
      // Usar el servicio para obtener información del usuario
      const userData = await sharedSessionService.getUserByEmail(normalizedEmail);
      
      // Determinar el mejor nombre para mostrar
      let displayName = null;
      
      if (userData.user) {
        const user = userData.user;
        
        // Preferir nombre y apellido si están disponibles
        if (user.nombre || user.apellido) {
          displayName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
        }
        // Si no, usar el nombre si existe y no es igual al email
        else if (user.name && user.name !== normalizedEmail && !normalizedEmail.includes(user.name)) {
          displayName = user.name;
        }
      }
      
      // Si no se encuentra un nombre adecuado, usar el email como respaldo
      const participant = {
        email: normalizedEmail,
        canEdit: Boolean(canEdit),
        canDelete: Boolean(canDelete),
        name: displayName || normalizedEmail.split('@')[0]
      };

      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participant]
      }));
      
      // Limpiar el formulario
      setEmail('');
      setCanEdit(false);
      setCanDelete(false);
      setEmailError('');
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      
      // Si hay error, agregar participante solo con email
      const participant = {
        email: normalizedEmail,
        canEdit: Boolean(canEdit),
        canDelete: Boolean(canDelete),
        name: normalizedEmail.split('@')[0]
      };

      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participant]
      }));
      
      // Limpiar el formulario
      setEmail('');
      setCanEdit(false);
      setCanDelete(false);
      setEmailError('');
    }
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
              {initialData ? 'Editar Sesión' : 'Nueva Sesión'}
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
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              autoFocus
              name="name"
              placeholder="Nombre de la sesión *"
              type="text"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            />

            <TextField
              name="description"
              placeholder="Descripción (opcional)"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            />

            <FormControl 
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: 2
                }
              }}
            >
              <Select
                name="sessionType"
                value={formData.sessionType}
                onChange={handleChange}
                displayEmpty
                renderValue={(selected) => {
                  const type = SESSION_TYPES.find(t => t.value === selected);
                  return type ? type.label : 'Tipo de Sesión *';
                }}
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

            <Box sx={{ 
              p: 2, 
              bgcolor: alpha(theme.palette.info.main, 0.05),
              borderRadius: 2
            }}>
              <Typography variant="subtitle2" gutterBottom>
                Participantes
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <TextField
                  placeholder="Email del participante"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  error={!!emailError}
                  helperText={emailError}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 2
                    }
                  }}
                />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
                    sx={{
                      borderRadius: 2,
                      ml: 'auto'
                    }}
                  >
                    Agregar
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.participants.map((participant) => (
                    <Chip
                      key={participant.email}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{participant.name && participant.name !== participant.email ? participant.name : participant.email.split('@')[0]}</span>
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
                        borderRadius: 2,
                        '& .MuiChip-label': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
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
          type="submit"
          variant="contained"
          color="info"
          disabled={loading || !formData.name.trim()}
          onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            borderRadius: 2,
            px: 3
          }}
        >
          {loading ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Crear Sesión')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionForm;
