import React, { useState, useEffect } from 'react';
import { Button, Snackbar, Box, Typography } from '@mui/material';
import { GetApp as InstallIcon } from '@mui/icons-material';

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

    // Capturar el evento beforeinstallprompt para mostrar botón personalizado
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir que Chrome muestre el prompt automáticamente
      e.preventDefault();
      // Guardar el evento para poder activarlo más tarde
      setDeferredPrompt(e);
      // Mostrar nuestro prompt personalizado
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
        maxWidth: '90vw'
      }}>
        <Typography variant="body1" sx={{ mr: 2, flexGrow: 1 }}>
          Instala Controling para una experiencia más rápida y usar sin conexión
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<InstallIcon />}
          onClick={handleInstallClick}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Instalar
        </Button>
      </Box>
    </Snackbar>
  );
};

export default PWAInstallPrompt; 