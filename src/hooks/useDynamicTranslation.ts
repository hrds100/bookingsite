import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText, translateBatch } from '@/lib/translate';

/** Returns the translated version of a single string.
 *  - Shows the original immediately (no flash of empty)
 *  - Fetches translation async if language is not English
 *  - Falls back to original on error
 */
export function useDynamicTranslation(text: string): string {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [translated, setTranslated] = useState(text);
  const lastText = useRef(text);
  const lastLang = useRef(lang);

  useEffect(() => {
    // Reset immediately when source text changes
    setTranslated(text);
    lastText.current = text;
    lastLang.current = lang;

    if (!text || lang === 'en') return;

    let cancelled = false;
    translateText(text, lang).then(result => {
      if (!cancelled) setTranslated(result);
    });

    return () => { cancelled = true; };
  }, [text, lang]);

  // If lang changed but text didn't, re-translate
  useEffect(() => {
    if (lang === lastLang.current) return;
    lastLang.current = lang;

    if (!text || lang === 'en') {
      setTranslated(text);
      return;
    }

    let cancelled = false;
    translateText(text, lang).then(result => {
      if (!cancelled) setTranslated(result);
    });

    return () => { cancelled = true; };
  }, [lang, text]);

  return translated;
}

/** Translates an array of strings. Returns original array until translations arrive. */
export function useDynamicTranslations(texts: string[]): string[] {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [translated, setTranslated] = useState<string[]>(texts);
  const key = texts.join('|||');

  useEffect(() => {
    setTranslated(texts);

    if (!texts.length || lang === 'en') return;

    let cancelled = false;
    translateBatch(texts, lang).then(results => {
      if (!cancelled) setTranslated(results);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang]);

  return translated;
}
