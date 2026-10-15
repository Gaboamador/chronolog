export const THEME_PREFERENCE_KEY = 'chronolog:theme-preference';
export const THEME_OPTIONS = ['light', 'dark', 'system'];
export const DEFAULT_THEME = 'dark';

export function resolveTheme(preference, systemDark) {
  const selected = THEME_OPTIONS.includes(preference) ? preference : DEFAULT_THEME;
  return selected === 'system' ? (systemDark ? 'dark' : 'light') : selected;
}

export function getThemePreference(storage) {
  try {
    const saved = storage.getItem(THEME_PREFERENCE_KEY);
    return THEME_OPTIONS.includes(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
