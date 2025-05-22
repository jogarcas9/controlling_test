import React from 'react';
import './NetworkStatus.css';

const NetworkStatus = ({ isOnline, serverHealthy }) => {
  if (isOnline && serverHealthy) {
    return null; // No mostrar nada si todo está bien
  }

  const message = !isOnline 
    ? 'Sin conexión a internet'
    : !serverHealthy 
      ? 'Problemas de conexión con el servidor'
      : '';

  return (
    <div className={`network-status ${!isOnline ? 'offline' : !serverHealthy ? 'server-error' : ''}`}>
      <div className="network-status-content">
        <span className="network-status-icon">
          {!isOnline ? '📡' : '🔌'}
        </span>
        <span className="network-status-message">{message}</span>
      </div>
    </div>
  );
};

export default NetworkStatus; 