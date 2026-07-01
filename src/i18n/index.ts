import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';

void i18n.use(initReactI18next).init({
  // React Native (Hermes) lacks Intl.PluralRules; use the v3 plural format
  // so i18next doesn't warn / fall back at runtime.
  compatibilityJSON: 'v3',
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  // Our bundle (and backend error `messageKey`s) use flat dotted keys like
  // "errors.auth.invalidCredentials" — treat them as literal keys, not nested
  // paths, so lookups resolve.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

export default i18n;
