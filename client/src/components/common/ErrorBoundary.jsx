import React, { Component } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { withTranslation } from 'react-i18next';
import { ErrorOutline } from '@mui/icons-material';

class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error) {
    // Actualizar el estado para que el siguiente renderizado muestre la interfaz de error
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar el error para propósitos de depuración
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    // Intentar recargar el componente
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    // Recargar la página completa
    window.location.reload();
  };

  handleGoBack = () => {
    // Volver a la página anterior
    window.history.back();
  };

  handleGoHome = () => {
    // Ir a la página principal
    window.location.href = '/dashboard';
  };

  render() {
    const { t } = this.props;
    
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <ErrorOutline color="error" sx={{ fontSize: 64, mb: 2 }} />
            
            <Typography variant="h5" color="error" gutterBottom>
              {t('errorOccurred', 'Ha ocurrido un error')}
            </Typography>
            
            <Typography variant="body1" color="textSecondary" paragraph sx={{ mb: 3 }}>
              {t('errorMessage', 'Lo sentimos, ha ocurrido un error al cargar esta página.')}
            </Typography>
            
            <Box sx={{ mb: 3, width: '100%' }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1, textAlign: 'left' }}>
                {this.state.error?.toString()}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={this.handleRetry}
              >
                {t('retry', 'Reintentar')}
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary"
                fullWidth 
                onClick={this.handleReload}
              >
                {t('reloadPage', 'Recargar página')}
              </Button>
              
              <Button 
                variant="outlined"
                fullWidth 
                onClick={this.handleGoBack}
              >
                {t('goBack', 'Volver atrás')}
              </Button>
              
              <Button 
                variant="text"
                fullWidth 
                onClick={this.handleGoHome}
              >
                {t('goToDashboard', 'Ir al Panel Principal')}
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary); 