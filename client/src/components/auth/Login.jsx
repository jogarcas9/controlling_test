import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Link,
  Paper,
  Alert
} from '@mui/material';
import { Link as RouterLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth as _useAuth } from '../../context/AuthContext';
// eslint-disable-next-line no-unused-vars
import api from '../../utils/api';
import authService from '../../services/authService';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Intentando login para:', email);
      
      // Usar el servicio de autenticación en lugar de la petición directa
      const response = await authService.login({ email, password });
      
      // Guardar información del usuario de forma explícita
      if (response && response.user) {
        // Establecer un nombre para mostrar basado en la información disponible
        let displayName = '';
        
        // Si hay nombre y apellidos, construir el nombre completo
        if (response.user.nombre && response.user.apellidos) {
          displayName = `${response.user.nombre} ${response.user.apellidos}`;
        } else {
          displayName = response.user.nombre || 
                        response.user.name || 
                        response.user.username || 
                        email.split('@')[0];
        }
                            
        localStorage.setItem('userName', displayName);
        localStorage.setItem('userEmail', response.user.email || email);
      }
      
      // Si llegamos aquí, el login fue exitoso
      // Usar setTimeout para asegurar que todos los datos se hayan guardado
      // antes de redirigir
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        window.location.reload(); // Forzar recarga para asegurar que los datos se actualicen
      }, 100);
    } catch (err) {
      console.error('Error en login:', err);
      setError(err.response?.data?.msg || err.message || 'Error al iniciar sesión. Por favor, verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      sx={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f8f9ff',
        px: 0
      }}
    >
      <Typography
        variant="h3"
        component="h1"
        sx={{
          fontWeight: 600,
          color: '#1f2937',
          mb: 6,
          textAlign: 'center'
        }}
      >
        Controling
      </Typography>

      <Box
        sx={{
          width: '100%',
          maxWidth: '400px'
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'divider',
            width: '100%'
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            align="center"
            sx={{
              mb: 4,
              fontWeight: 500,
              color: '#1f2937'
            }}
          >
            Login
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  color: '#4b5563',
                  fontWeight: 500
                }}
              >
                Email Address
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                variant="outlined"
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    bgcolor: '#fff',
                    '& fieldset': {
                      borderColor: '#e5e7eb',
                    },
                    '&:hover fieldset': {
                      borderColor: '#2563eb',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2563eb',
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  color: '#4b5563',
                  fontWeight: 500
                }}
              >
                Password
              </Typography>
              <TextField
                fullWidth
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                variant="outlined"
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    bgcolor: '#fff',
                    '& fieldset': {
                      borderColor: '#e5e7eb',
                    },
                    '&:hover fieldset': {
                      borderColor: '#2563eb',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2563eb',
                    },
                  },
                }}
              />
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                mt: 2,
                mb: 3,
                py: 1.5,
                bgcolor: '#2563eb',
                '&:hover': {
                  bgcolor: '#1d4ed8',
                },
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 1
              }}
            >
              {loading ? 'Iniciando sesión...' : 'Login'}
            </Button>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 2,
                textAlign: 'center'
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: '#6b7280' }}
              >
                Don't have an account?
              </Typography>
              <Link
                component={RouterLink}
                to="/register"
                sx={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Create an account
              </Link>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <Link
                component={RouterLink}
                to="/forgot-password"
                sx={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot password?
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 