import React, { useState, useEffect } from 'react';
import { Button, Snackbar, IconButton } from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloseIcon from '@mui/icons-material/Close';

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    // Comprobar si la app ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      console.log('Aplicación ya instalada en modo standalone');
      return;
    }

    // Escuchar el evento beforeinstallprompt 
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir que Chrome muestre el diálogo automáticamente
      e.preventDefault();
      // Guardar el evento para uso posterior
      setInstallPrompt(e);
      // Guardar también en una variable global para uso en otros componentes
      window.deferredPrompt = e;
      // Mostrar el botón de instalación
      setShowInstallButton(true);
      // Mostrar un snackbar para informar al usuario
      setOpenSnackbar(true);
      
      console.log('Evento beforeinstallprompt capturado en InstallPWA');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Si ya hay un evento de instalación disponible
    if (window.deferredPrompt) {
      handleBeforeInstallPrompt(window.deferredPrompt);
    }

    // Verificar si la app ya está instalada
    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setOpenSnackbar(false);
      // Limpiar la referencia global
      window.deferredPrompt = null;
      console.log('Aplicación instalada correctamente');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Limpieza
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      console.log('No hay evento de instalación disponible');
      
      // Si no hay installPrompt pero sí window.deferredPrompt, usarlo
      if (window.deferredPrompt) {
        console.log('Usando deferredPrompt global');
        triggerInstall(window.deferredPrompt);
        return;
      }
      
      setOpenSnackbar(false);
      return;
    }

    triggerInstall(installPrompt);
  };
  
  const triggerInstall = (promptEvent) => {
    // Mostrar el prompt de instalación
    promptEvent.prompt();
    console.log('Mostrando prompt de instalación');

    // Esperar a que el usuario responda al prompt
    promptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario aceptó la instalación');
        setShowInstallButton(false);
        setOpenSnackbar(false);
      } else {
        console.log('Usuario rechazó la instalación');
        // Guardar en localStorage que el usuario rechazó para no molestar constantemente
        localStorage.setItem('pwaInstallRejected', Date.now().toString());
      }
      
      // Limpiar el prompt - solo se puede usar una vez
      setInstallPrompt(null);
      window.deferredPrompt = null;
    })
    .catch(error => {
      console.error('Error al mostrar prompt de instalación:', error);
      setInstallPrompt(null);
      window.deferredPrompt = null;
    });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };

  if (!showInstallButton) return null;

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<GetAppIcon />}
        onClick={handleInstallClick}
        sx={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px',
          zIndex: 1000,
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          minWidth: 'unset',
          '& .MuiButton-startIcon': {
            margin: 0
          }
        }}
      >
        <span className="sr-only">Instalar App</span>
      </Button>
      
      <Snackbar
        open={openSnackbar}
        autoHideDuration={10000}
        onClose={handleCloseSnackbar}
        message="¡Instala Controling en tu dispositivo!"
        action={
          <>
            <Button 
              color="secondary" 
              size="small" 
              onClick={handleInstallClick}
            >
              INSTALAR
            </Button>
            <IconButton
              size="small"
              color="inherit"
              onClick={handleCloseSnackbar}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      />
    </>
  );
};

export default InstallPWA; 