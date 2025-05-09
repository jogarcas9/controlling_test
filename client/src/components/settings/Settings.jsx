import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Tab,
  Tabs,
  TextField,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  Language as LanguageIcon,
  MonetizationOn as MonetizationOnIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import i18n from '../../i18n';

const currencies = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dólar EE.UU ($)' },
  { value: 'MXN', label: 'Peso Mexicano ($)' },
  { value: 'GBP', label: 'Libra Esterlina (£)' },
  { value: 'JPY', label: 'Yen Japonés (¥)' }
];

const languages = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' }
];

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings = () => {
  const { t = key => key } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    darkMode: false,
    language: 'es',
    currency: 'EUR'
  });
  
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    createdAt: '',
    avatar: ''
  });
  
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    firstName: '',
    lastName: ''
  });

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const savedSettings = JSON.parse(localStorage.getItem('appSettings')) || {
          darkMode: false,
          language: 'es',
          currency: 'EUR'
        };
        
        setSettings(savedSettings);
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        showMessage('error', 'Error al cargar la configuración');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchUserProfile = async () => {
      setProfileLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const userName = localStorage.getItem('userName') || 'Usuario';
        const userEmail = localStorage.getItem('userEmail') || 'usuario@ejemplo.com';
        
        const profile = {
          firstName: userName.split(' ')[0] || 'Usuario',
          lastName: userName.split(' ')[1] || '',
          email: userEmail,
          createdAt: new Date().toISOString(),
          avatar: ''
        };
        
        setUserProfile(profile);
        setEditedProfile({
          firstName: profile.firstName,
          lastName: profile.lastName
        });
        
      } catch (error) {
        console.error('Error al cargar perfil del usuario:', error);
        showMessage('error', 'Error al cargar el perfil del usuario');
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchSettings();
    fetchUserProfile();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setOpenSnackbar(true);
  };
  
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSettingChange = async (setting, value) => {
    try {
      const updatedSettings = {
        ...settings,
        [setting]: value
      };
      
      setSettings(updatedSettings);
      
      if (setting === 'language') {
        i18n.changeLanguage(value);
      }
      
      localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
      
      window.dispatchEvent(new CustomEvent('settingsChanged', { 
        detail: { setting, value } 
      }));
      
      showMessage('success', t('settingsUpdated'));
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      showMessage('error', t('errorUpdatingSettings'));
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(settings.language, options);
  };
  
  const handleEditProfile = () => {
    setEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedProfile({
      firstName: userProfile.firstName,
      lastName: userProfile.lastName
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      setUserProfile(prev => ({
        ...prev,
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName
      }));
      
      const fullName = `${editedProfile.firstName} ${editedProfile.lastName}`.trim();
      localStorage.setItem('userName', fullName);
      
      setEditMode(false);
      showMessage('success', t('profileUpdated'));
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      showMessage('error', t('errorUpdatingProfile'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !editMode) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container 
      maxWidth={false} 
      disableGutters 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: { xs: 1, sm: 2 },
        px: 0
      }}
    >
      <Box sx={{ px: { xs: 1, sm: 1.5 }, width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="configuración tabs">
            <Tab label={t('general')} id="settings-tab-0" />
            <Tab label={t('profile')} id="settings-tab-1" />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          <Paper elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <DarkModeIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={t('darkMode')} 
                  secondary={t('darkModeDesc')}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={settings.darkMode}
                    onChange={() => handleSettingChange('darkMode', !settings.darkMode)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider component="li" />
              
              <ListItem>
                <ListItemIcon>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={t('language')} 
                  secondary={t('languageDesc')}
                />
                <ListItemSecondaryAction>
                  <FormControl variant="standard" sx={{ minWidth: 120 }}>
                    <Select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      displayEmpty
                    >
                      {languages.map((lang) => (
                        <MenuItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider component="li" />
              
              <ListItem>
                <ListItemIcon>
                  <MonetizationOnIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={t('currency')} 
                  secondary={t('currencyDesc')}
                />
                <ListItemSecondaryAction>
                  <FormControl variant="standard" sx={{ minWidth: 150 }}>
                    <Select
                      value={settings.currency}
                      onChange={(e) => handleSettingChange('currency', e.target.value)}
                      displayEmpty
                    >
                      {currencies.map((currency) => (
                        <MenuItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          {profileLoading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card elevation={0} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    <Avatar 
                      sx={{ 
                        width: 120, 
                        height: 120, 
                        mb: 2,
                        bgcolor: 'primary.main',
                        fontSize: '3rem'
                      }}
                    >
                      {userProfile.firstName.charAt(0)}
                    </Avatar>
                    
                    <Typography variant="h5" gutterBottom>
                      {userProfile.firstName} {userProfile.lastName}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {userProfile.email}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      {t('memberSince')} {formatDate(userProfile.createdAt)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Card elevation={0} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6">
                        <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        {t('personalInfo')}
                      </Typography>
                      
                      {!editMode && (
                        <Button 
                          startIcon={<EditIcon />} 
                          onClick={handleEditProfile}
                          variant="outlined"
                          size="small"
                        >
                          {t('edit')}
                        </Button>
                      )}
                    </Box>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    {editMode ? (
                      <Box component="form">
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              name="firstName"
                              label={t('firstName')}
                              fullWidth
                              value={editedProfile.firstName}
                              onChange={handleInputChange}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              name="lastName"
                              label={t('lastName')}
                              fullWidth
                              value={editedProfile.lastName}
                              onChange={handleInputChange}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              label={t('email')}
                              fullWidth
                              value={userProfile.email}
                              disabled
                              helperText={t('emailDesc')}
                            />
                          </Grid>
                          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                              onClick={handleCancelEdit}
                              sx={{ mr: 1 }}
                              disabled={loading}
                            >
                              {t('cancel')}
                            </Button>
                            <Button 
                              variant="contained" 
                              onClick={handleSaveProfile}
                              disabled={loading}
                            >
                              {loading ? <CircularProgress size={24} /> : t('save')}
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    ) : (
                      <Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                              {t('firstName')}
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                              {userProfile.firstName}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                              {t('lastName')}
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                              {userProfile.lastName}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                              {t('email')}
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                              {userProfile.email}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                              {t('registerDate')}
                            </Typography>
                            <Typography variant="body1">
                              {formatDate(userProfile.createdAt)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
                
                <Card elevation={0} sx={{ borderRadius: 2, mt: 3 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <SecurityIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        {t('security')}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    <Button 
                      variant="outlined"
                      color="primary"
                      sx={{ mr: 2 }}
                    >
                      {t('changePassword')}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
        
        <Snackbar 
          open={openSnackbar} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={message.type} sx={{ width: '100%' }}>
            {message.text}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default Settings; 