import { createContext, useContext, useEffect, useState } from 'react';

import { DEFAULT_THEME, THEME_PREFERENCE_KEY, getThemePreference, resolveTheme } from '@/utils/themePreference';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    try { return getThemePreference(window.localStorage); }
    catch { return DEFAULT_THEME; }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (event) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const nextTheme = resolveTheme(preference, systemDark);
    document.documentElement.dataset.theme = nextTheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', nextTheme === 'dark' ? '#000000' : '#0b2233');
    try { window.localStorage.setItem(THEME_PREFERENCE_KEY, preference); } catch { /* La UI sigue funcionando sin almacenamiento. */ }
  }, [preference, systemDark]);

  return (
    <ThemeContext.Provider value={{ preference, setPreference, resolvedTheme: resolveTheme(preference, systemDark) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider');
  return context;
}
