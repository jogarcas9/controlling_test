import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon
} from '@mui/icons-material';

const MonthSelector = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onCurrentMonth
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getShortMonthName = (monthIndex) => {
    return monthNames[monthIndex].substring(0, 3);
  };

  const handlePreviousMonth = () => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (newMonth === 0) {
      newMonth = 11;
      newYear = newYear - 1;
    } else {
      newMonth = newMonth - 1;
    }

    onMonthChange(newMonth);
    onYearChange(newYear);
  };

  const handleNextMonth = () => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (newMonth === 11) {
      newMonth = 0;
      newYear = newYear + 1;
    } else {
      newMonth = newMonth + 1;
    }

    onMonthChange(newMonth);
    onYearChange(newYear);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '50px',
        border: '1px solid #e0e0e0',
        padding: '2px 4px',
        width: 'auto',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <IconButton
        size="small"
        onClick={handlePreviousMonth}
        sx={{ color: '#666' }}
      >
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        padding: '4px 12px',
        minWidth: '140px',
        justifyContent: 'center'
      }}>
        <Typography 
          variant="body1"
          sx={{
            fontWeight: 500,
            color: '#555',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <TodayIcon 
            sx={{ 
              mr: 1,
              color: '#7986cb',
              fontSize: '18px'
            }} 
          />
          {isMobile ? getShortMonthName(selectedMonth) : monthNames[selectedMonth]} {selectedYear}
        </Typography>
      </Box>
      
      <IconButton
        size="small"
        onClick={handleNextMonth}
        sx={{ color: '#666' }}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
      
      <Box 
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ml: 1,
          pl: 1,
          borderLeft: '1px solid #e0e0e0',
          height: '30px'
        }}
      >
        <IconButton
          size="small"
          onClick={onCurrentMonth}
          sx={{ color: '#666' }}
        >
          <TodayIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default MonthSelector; 