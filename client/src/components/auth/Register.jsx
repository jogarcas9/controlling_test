import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  Paper,
  Grid
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await register({
        username: formData.username,
        name: formData.name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error durante el registro');
    }
  };

  const inputProps = {
    style: { padding: '14px 12px' }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            Registro
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              variant="outlined"
              placeholder="Nombre de usuario *"
              inputProps={inputProps}
              label=""
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal"
                  fullWidth
                  id="name"
                  name="name"
                  autoComplete="given-name"
                  value={formData.name}
                  onChange={handleChange}
                  variant="outlined"
                  placeholder="Nombre"
                  inputProps={inputProps}
                  label=""
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="normal"
                  fullWidth
                  id="last_name"
                  name="last_name"
                  autoComplete="family-name"
                  value={formData.last_name}
                  onChange={handleChange}
                  variant="outlined"
                  placeholder="Apellido"
                  inputProps={inputProps}
                  label=""
                />
              </Grid>
            </Grid>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              placeholder="Correo electrónico *"
              inputProps={inputProps}
              label=""
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              variant="outlined"
              placeholder="Contraseña *"
              inputProps={inputProps}
              label=""
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              variant="outlined"
              placeholder="Confirmar contraseña *"
              inputProps={inputProps}
              label=""
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Registrarse
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/login')}
            >
              ¿Ya tienes una cuenta? Inicia sesión
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register; 