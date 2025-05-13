import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Button,
  CircularProgress
} from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import BugReportIcon from '@mui/icons-material/BugReport';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Componente para diagnosticar el estado de la PWA
 */
const PWAStatus = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState([]);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Capturar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir que Chrome muestre el prompt automáticamente
      e.preventDefault();
      // Guardar el evento para poder activarlo más tarde
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar cuando la app se instala
    window.addEventListener('appinstalled', () => {
      console.log('PWA instalada correctamente');
      setCanInstall(false);
      setDeferredPrompt(null);
      checkPWAStatus(); // Actualizar el estado después de instalar
    });

    checkPWAStatus();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const checkPWAStatus = async () => {
    setLoading(true);
    const statusChecks = [];

    // Comprobar si el navegador soporta service workers
    statusChecks.push({
      name: 'Soporte para Service Workers',
      status: 'navigator.serviceWorker' in window ? 'success' : 'error',
      details: 'navigator.serviceWorker' in window 
        ? 'Tu navegador soporta Service Workers' 
        : 'Tu navegador no soporta Service Workers, lo que es necesario para PWAs'
    });

    // Comprobar si está en modo standalone (instalada)
    statusChecks.push({
      name: 'Aplicación instalada',
      status: window.matchMedia('(display-mode: standalone)').matches ? 'success' : 'warning',
      details: window.matchMedia('(display-mode: standalone)').matches
        ? 'La aplicación está instalada y ejecutándose en modo standalone'
        : 'La aplicación se está ejecutando en el navegador, no está instalada como PWA'
    });

    // Comprobar si hay un service worker registrado
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      statusChecks.push({
        name: 'Service Worker registrado',
        status: registrations.length > 0 ? 'success' : 'error',
        details: registrations.length > 0
          ? `Service Worker registrado (${registrations.length} encontrados)`
          : 'No hay Service Workers registrados'
      });

      // Si hay registros, mostrar información
      if (registrations.length > 0) {
        registrations.forEach((registration, index) => {
          statusChecks.push({
            name: `Service Worker #${index + 1}`,
            status: 'info',
            details: `Scope: ${registration.scope}, Estado: ${registration.active ? 'Activo' : 'Inactivo'}`
          });
        });
      }
    } catch (err) {
      statusChecks.push({
        name: 'Service Worker registrado',
        status: 'error',
        details: `Error al comprobar el Service Worker: ${err.message}`
      });
    }

    // Comprobar si el manifest.json se carga correctamente
    try {
      const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
      if (manifestLinks.length > 0) {
        const manifestUrl = manifestLinks[0].href;
        try {
          const response = await fetch(manifestUrl);
          if (response.ok) {
            const manifest = await response.json();
            statusChecks.push({
              name: 'Manifest.json',
              status: 'success',
              details: `Manifest cargado correctamente: ${manifest.name || 'Sin nombre'}`
            });
          } else {
            statusChecks.push({
              name: 'Manifest.json',
              status: 'error',
              details: `Error al cargar manifest.json: ${response.status} ${response.statusText}`
            });
          }
        } catch (err) {
          statusChecks.push({
            name: 'Manifest.json',
            status: 'error',
            details: `Error al cargar manifest.json: ${err.message}`
          });
        }
      } else {
        statusChecks.push({
          name: 'Manifest.json',
          status: 'error',
          details: 'No se encontró el enlace al manifest.json en el HTML'
        });
      }
    } catch (err) {
      statusChecks.push({
        name: 'Manifest.json',
        status: 'error',
        details: `Error al verificar manifest.json: ${err.message}`
      });
    }

    // Comprobar si los iconos están disponibles
    const iconUrls = ['/images/logo192.png', '/images/logo512.png'];
    for (const iconUrl of iconUrls) {
      try {
        const response = await fetch(iconUrl);
        statusChecks.push({
          name: `Icono: ${iconUrl}`,
          status: response.ok ? 'success' : 'error',
          details: response.ok 
            ? `Icono cargado correctamente` 
            : `Error al cargar el icono: ${response.status} ${response.statusText}`
        });
      } catch (err) {
        statusChecks.push({
          name: `Icono: ${iconUrl}`,
          status: 'error',
          details: `Error al cargar el icono: ${err.message}`
        });
      }
    }

    // Verificar conexión al backend
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        statusChecks.push({
          name: 'Conexión al backend',
          status: 'success',
          details: `API conectada: ${data.status}, DB: ${data.database}`
        });
      } else {
        statusChecks.push({
          name: 'Conexión al backend',
          status: 'error',
          details: `Error al conectar con el backend: ${response.status} ${response.statusText}`
        });
      }
    } catch (err) {
      statusChecks.push({
        name: 'Conexión al backend',
        status: 'error',
        details: `Error al conectar con el backend: ${err.message}`
      });
    }

    setStatus(statusChecks);
    setLoading(false);
  };

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
    });
  };

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
      default:
        return <BugReportIcon color="info" />;
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Paper elevation={3} sx={{ padding: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2" gutterBottom>
            Estado de la PWA
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={checkPWAStatus}
            disabled={loading}
          >
            Actualizar
          </Button>
        </Box>

        {canInstall && (
          <Box mb={3} p={2} bgcolor="primary.light" color="white" borderRadius={1}>
            <Typography variant="body1" gutterBottom>
              ¡Esta aplicación puede instalarse como PWA!
            </Typography>
            <Button 
              variant="contained" 
              color="secondary"
              onClick={handleInstallClick}
            >
              Instalar Aplicación
            </Button>
          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {status.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider variant="inset" component="li" />}
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(item.status)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.name} 
                    secondary={item.details} 
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default PWAStatus; 