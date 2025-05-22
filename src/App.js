import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { connectionManager } from './utils/connectionManager';
import { initializePrefetch } from './utils/prefetchConfig';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import NetworkStatus from './components/common/NetworkStatus';
import LoadingOverlay from './components/common/LoadingOverlay';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    isOnline: navigator.onLine,
    serverHealthy: true
  });

  useEffect(() => {
    // Inicializar prefetch de datos comunes
    initializePrefetch().catch(console.error);

    // Configurar monitoreo de conexión
    const handleConnectionChange = (status) => {
      setConnectionStatus(status);
    };

    connectionManager.addListener(handleConnectionChange);

    // Simular tiempo de carga mínimo para evitar parpadeos
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      connectionManager.removeListener(handleConnectionChange);
      clearTimeout(loadingTimer);
    };
  }, []);

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <Provider store={store}>
      <Router>
        <div className="app-container">
          <NetworkStatus 
            isOnline={connectionStatus.isOnline}
            serverHealthy={connectionStatus.serverHealthy}
          />
          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </Provider>
  );
}

export default App; 