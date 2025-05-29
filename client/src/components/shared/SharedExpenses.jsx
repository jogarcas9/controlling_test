import { 
  EXPENSE_CATEGORIES,
  formatAmount,
  getCategoryColor,
  getExpenseTypeLabel
} from '../../utils/expenseUtils';

// ... rest of the code ...

// En la sección de la tabla, reemplazar la columna "Recurrente"
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="center">Categoría</TableCell>
                  <TableCell align="center">Fecha</TableCell>
                  <TableCell align="center">Monto</TableCell>
                  <TableCell align="center">Tipo</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map(expense => {
                  const date = new Date(expense.date);
                  const formattedDate = format(date, 'dd MMM yyyy', { locale: es });
                  // Calcular el tipo de gasto con la fecha seleccionada
                  const currentDate = new Date(selectedYear, selectedMonth);
                  const typeLabel = getExpenseTypeLabel(expense, currentDate);

                  return (
                    <TableRow 
                      // ... existing row props ...
                    >
                      {/* ... other cells ... */}
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={typeLabel}
                          color={
                            expense.isRecurring ? "primary" :
                            expense.isPeriodic ? "info" :
                            "default"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      {/* ... rest of the cells ... */}
                    </TableRow>
                  );
                })}
              </TableBody> 