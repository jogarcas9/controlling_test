import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * Componente de diálogo de confirmación personalizado
 * 
 * @param {Object} props
 * @param {boolean} props.open - Si el diálogo está abierto
 * @param {function} props.onClose - Función para cerrar el diálogo
 * @param {function} props.onConfirm - Función a ejecutar al confirmar
 * @param {string} props.title - Título del diálogo
 * @param {string} props.message - Mensaje de confirmación
 * @param {string} props.confirmText - Texto del botón de confirmación
 * @param {string} props.cancelText - Texto del botón de cancelación
 * @param {string} props.confirmColor - Color del botón de confirmación
 */
const ConfirmDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  title = "Confirmar acción", 
  message = "¿Estás seguro de que deseas realizar esta acción?", 
  confirmText = "Confirmar", 
  cancelText = "Cancelar", 
  confirmColor = "primary" 
}) => {
  const handleConfirm = async () => {
    try {
      console.log('[DEBUG] Ejecutando acción de confirmación...');
      // Si onConfirm devuelve una promesa, esperar a que se resuelva
      if (onConfirm && typeof onConfirm === 'function') {
        await onConfirm();
        console.log('[DEBUG] Acción de confirmación completada exitosamente');
      }
    } catch (error) {
      console.error('[ERROR] Error durante la acción de confirmación:', error);
      // Propagar el error para que sea manejado por la componente padre
      throw error;
    } finally {
      // Cerrar el diálogo después de que se complete la acción (éxito o error)
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 3
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 2,
        px: 3
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'grey.500',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 3, px: 3 }}>
        <DialogContentText>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ 
        px: 3, 
        py: 2,
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, width: '100%' }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm} 
            color={confirmColor}
            variant="contained"
            sx={{ borderRadius: 2 }}
            autoFocus
          >
            {confirmText}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog; 