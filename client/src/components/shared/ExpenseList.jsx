import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { formatDate, formatCurrency } from '../../utils/dateHelpers';

const ExpenseList = ({ expenses, onEdit, onDelete }) => {
  if (!expenses || expenses.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No hay gastos registrados
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <List>
        {expenses.map((expense) => (
          <ListItem key={expense._id} divider>
            <ListItemText
              primary={expense.description}
              secondary={
                <>
                  <Typography
                    component="span"
                    variant="body2"
                    color="textSecondary"
                  >
                    {formatDate(expense.date)}
                  </Typography>
                  {expense.category && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="textSecondary"
                      sx={{ ml: 2 }}
                    >
                      {expense.category}
                    </Typography>
                  )}
                </>
              }
            />
            <Typography
              variant="body1"
              color="primary"
              sx={{ mr: 2, fontWeight: 'medium' }}
            >
              {formatCurrency(expense.amount)}
            </Typography>
            <ListItemSecondaryAction>
              <Tooltip title="Editar">
                <IconButton
                  edge="end"
                  aria-label="editar"
                  onClick={() => onEdit(expense)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton
                  edge="end"
                  aria-label="eliminar"
                  onClick={() => onDelete(expense._id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default ExpenseList; 