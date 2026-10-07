import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json';

const STORAGE_KEY = 'weathergpt_language';

const translations = { en, te, hi };

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' }
];

const LanguageContext = createContext(null);

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['en', 'te', 'hi'].includes(stored)) {
        return stored;
      }
    } catch (e) {
      console.error('[i18n] Failed to read stored language:', e);
    }
    return 'en';
  });

  const changeLanguage = useCallback((newLang) => {
    if (!['en', 'te', 'hi'].includes(newLang)) return;
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.error('[i18n] Failed to persist language:', e);
    }
  }, []);

  const t = useCallback((path, defaultVal = '') => {
    const currentDict = translations[language] || translations.en;
    const value = getNestedValue(currentDict, path);
    if (value !== undefined) return value;
    
    // Fallback to English if not found in current language
    const enValue = getNestedValue(translations.en, path);
    if (enValue !== undefined) return enValue;

    return defaultVal || path;
  }, [language]);

  const translateWeatherCondition = useCallback((conditionStr) => {
    if (!conditionStr || typeof conditionStr !== 'string') return conditionStr;
    const lower = conditionStr.toLowerCase().trim();
    
    let key = null;
    if (lower.includes('thunderstorm') && lower.includes('rain')) key = 'thunderstormRain';
    else if (lower.includes('heavy') && lower.includes('thunderstorm')) key = 'heavyThunderstorm';
    else if (lower.includes('thunderstorm')) key = 'thunderstorm';
    else if (lower.includes('heavy') && lower.includes('rain')) key = 'heavyRain';
    else if (lower.includes('light') && lower.includes('rain')) key = 'lightRain';
    else if (lower.includes('freezing') && lower.includes('rain')) key = 'freezingRain';
    else if (lower.includes('rain')) key = 'moderateRain';
    else if (lower.includes('drizzle')) key = 'moderateDrizzle';
    else if (lower.includes('snow')) key = 'moderateSnow';
    else if (lower.includes('partly') || lower.includes('scattered')) key = 'partlyCloudy';
    else if (lower.includes('overcast')) key = 'overcast';
    else if (lower.includes('cloud')) key = 'cloudy';
    else if (lower.includes('fog')) key = 'fog';
    else if (lower.includes('mist')) key = 'mist';
    else if (lower.includes('haze') || lower.includes('hazy')) key = 'hazy';
    else if (lower.includes('sunny')) key = 'sunny';
    else if (lower.includes('clear')) key = 'clear';

    if (key) {
      const translated = getNestedValue(translations[language], `weatherConditions.${key}`);
      if (translated) return translated;
    }

    return conditionStr;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t,
        translateWeatherCondition,
        supportedLanguages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export function useLanguage() {
  return useTranslation();
}
