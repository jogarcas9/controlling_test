import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import { formatCurrency } from '../../utils/dateHelpers';

const DistributionTable = ({ distributions, total }) => {
  if (!distributions || distributions.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No hay distribuciones disponibles
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Usuario</TableCell>
            <TableCell align="right">Monto</TableCell>
            <TableCell align="right">Porcentaje</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {distributions.map((distribution) => (
            <TableRow key={distribution.userId}>
              <TableCell component="th" scope="row">
                {distribution.userName}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(distribution.amount)}
              </TableCell>
              <TableCell align="right">
                {((distribution.amount / total) * 100).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell component="th" scope="row">
              <strong>Total</strong>
            </TableCell>
            <TableCell align="right">
              <strong>{formatCurrency(total)}</strong>
            </TableCell>
            <TableCell align="right">
              <strong>100%</strong>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DistributionTable; 