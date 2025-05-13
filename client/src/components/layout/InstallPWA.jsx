import React, { useState, useEffect } from 'react';
import { Button, Snackbar, IconButton } from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloseIcon from '@mui/icons-material/Close';

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    // Escuchar el evento beforeinstallprompt 
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir que Chrome muestre el diálogo automáticamente
      e.preventDefault();
      // Guardar el evento para uso posterior
      setInstallPrompt(e);
      // Mostrar el botón de instalación
      setShowInstallButton(true);
      // Mostrar un snackbar para informar al usuario
      setOpenSnackbar(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verificar si la app ya está instalada
    const handleAppInstalled = () => {
      setShowInstallButton(false);
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
    if (!installPrompt) return;

    // Mostrar el prompt de instalación
    installPrompt.prompt();

    // Esperar a que el usuario responda al prompt
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario aceptó la instalación');
        setShowInstallButton(false);
      } else {
        console.log('Usuario rechazó la instalación');
      }
      // Limpiar el prompt - solo se puede usar una vez
      setInstallPrompt(null);
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