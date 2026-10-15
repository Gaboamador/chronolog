import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME, THEME_PREFERENCE_KEY, getThemePreference, resolveTheme } from '../src/utils/themePreference.js';

test('el tema oscuro es predeterminado y se ignoran preferencias no reconocidas', () => {
  assert.equal(DEFAULT_THEME, 'dark');
  assert.equal(getThemePreference({ getItem: () => 'valor-antiguo' }), 'dark');
  assert.equal(resolveTheme('invalido', false), 'dark');
});

test('el tema automático sigue la preferencia del dispositivo', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('la preferencia local se recupera aunque el almacenamiento esté restringido', () => {
  assert.equal(getThemePreference({ getItem: (key) => key === THEME_PREFERENCE_KEY ? 'light' : null }), 'light');
  assert.equal(getThemePreference({ getItem: () => { throw new Error('blocked'); } }), 'dark');
});
