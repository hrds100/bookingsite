import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import ptBR from '../locales/pt-BR.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en:      { translation: en },
      'pt-BR': { translation: ptBR },
      es:      { translation: es },
      fr:      { translation: fr },
      ar:      { translation: ar },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'nfs_language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

// Handle RTL for Arabic
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
