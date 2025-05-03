import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar traducciones
import es from './translations/es.json';
import en from './translations/en.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

// Recursos de traducción
const resources = {
  es: { translation: es },
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('appLanguage') || 'es', // Usar el idioma guardado o español por defecto
    fallbackLng: ['es', 'en'],
    debug: false, // Desactivar debug para evitar logs innecesarios
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'appLanguage',
    },
  });

export default i18n; 