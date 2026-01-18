'use client';

import { useLanguage } from '@/context/language-provider';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';

const translations = { en, hi };

// Define a type for the keys to ensure type safety
export type TranslationKey = keyof typeof en;

export function useTranslation() {
  const { language, setLanguage } = useLanguage();

  const t = (key: TranslationKey): string => {
    // Fallback to English if a key is missing in the current language
    const translation = translations[language] as Record<TranslationKey, string>;
    return translation[key] || en[key] || key;
  };

  return { t, setLanguage, language };
}
