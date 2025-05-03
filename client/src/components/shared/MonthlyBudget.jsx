import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import axios from 'axios';

const MonthlyBudget = ({ sessionId }) => {
  const [budget, setBudget] = useState({
    alquiler: 821.00,
    agua: 31.14,
    luz: 55.87,
    gas: 0,
    mercado: 493.74,
    vodafone: 55.13,
    cama: 54.22,
    camioneta: 278.55,
    tio_cono: 143.23,
    prestamo_ing: 0,
    prestamo_bbva: 0,
    seguro_camioneta: 0,
    seguro_hogar: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBudget();
  }, [sessionId]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5001/api/shared-sessions/${sessionId}/budget`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.budget) {
        setBudget(response.data.budget);
      }
    } catch (err) {
      setError('Error al cargar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5001/api/shared-sessions/${sessionId}/budget`,
        { budget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Presupuesto guardado exitosamente');
    } catch (err) {
      setError('Error al guardar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return Object.values(budget).reduce((acc, curr) => acc + Number(curr), 0);
  };

  if (loading && !budget) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Presupuesto Mensual del Hogar
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Concepto</TableCell>
                <TableCell align="right">Monto (€)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(budget).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell>
                    {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      value={value}
                      onChange={(e) => setBudget({ ...budget, [key]: Number(e.target.value) })}
                      inputProps={{
                        step: "0.01",
                        min: "0",
                        style: { textAlign: 'right' }
                      }}
                      size="small"
                      sx={{ width: '150px' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  € {calculateTotal().toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Guardar Presupuesto'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MonthlyBudget; 