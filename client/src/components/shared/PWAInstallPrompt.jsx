import React, { useState, useEffect } from 'react';
import { Button, Snackbar, Box, Typography, IconButton } from '@mui/material';
import { GetApp as InstallIcon, Close as CloseIcon } from '@mui/icons-material';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar si la app ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Verificar si el usuario ha descartado el prompt recientemente
    const lastDismissed = localStorage.getItem('pwaPromptDismissed');
    if (lastDismissed) {
      const timeSinceLastDismissed = Date.now() - parseInt(lastDismissed, 10);
      // Si hace menos de 24 horas que lo descartó, no mostrar
      if (timeSinceLastDismissed < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Capturar el evento beforeinstallprompt para mostrar botón personalizado
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir que Chrome muestre el prompt automáticamente
      e.preventDefault();
      // Guardar el evento para poder activarlo más tarde
      setDeferredPrompt(e);
      // Mostrar nuestro prompt personalizado después de un breve retraso
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 500);
      
      console.log('Evento beforeinstallprompt capturado y guardado correctamente');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si ya hay un evento de instalación disponible en la sesión actual
    if (window.deferredPrompt) {
      handleBeforeInstallPrompt(window.deferredPrompt);
    }

    // Detectar cuando la app se instala
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA instalada correctamente');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar a que el usuario responda al prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario aceptó instalar la PWA');
      } else {
        console.log('Usuario rechazó instalar la PWA');
      }
      // Resetear el prompt, solo se puede usar una vez
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    });
  };

  const handleClosePrompt = () => {
    setShowInstallPrompt(false);
    // Guarda esta elección en localStorage para no mostrar tan seguido
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  if (!showInstallPrompt || isInstalled) return null;

  return (
    <Snackbar
      open={showInstallPrompt}
      onClose={handleClosePrompt}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      autoHideDuration={null}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
        maxWidth: '90vw',
        position: 'relative'
      }}>
        <Typography variant="body1" sx={{ mr: 2, flexGrow: 1 }}>
          Instala Controling en tu dispositivo para usarla como una aplicación, incluso sin conexión
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<InstallIcon />}
          onClick={handleInstallClick}
          sx={{ whiteSpace: 'nowrap', mr: 1 }}
        >
          Instalar
        </Button>
        <IconButton
          size="small"
          color="inherit"
          onClick={handleClosePrompt}
          aria-label="cerrar"
          sx={{ 
            padding: 0.5,
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Snackbar>
  );
};

export default PWAInstallPrompt; 