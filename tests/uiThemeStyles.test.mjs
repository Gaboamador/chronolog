import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const theme = readFileSync(new URL('../src/styles/theme.scss', import.meta.url), 'utf8');
const calendar = readFileSync(new URL('../src/componentes/FormularioHora/FormularioHora.module.scss', import.meta.url), 'utf8');
const summary = readFileSync(new URL('../src/componentes/ResumenSemana/ResumenSemana.module.scss', import.meta.url), 'utf8');
const navbar = readFileSync(new URL('../src/componentes/MobileNavigation/MobileNavigation.module.scss', import.meta.url), 'utf8');

test('ambos temas definen bordes sutiles/destacados y acento del calendario', () => {
  for (const token of ['border-subtle', 'border-strong', 'calendar-accent', 'calendar-selected-bg']) {
    assert.equal((theme.match(new RegExp(`--${token}:`, 'g')) || []).length, 2, token);
  }
});

test('la ausencia sólo agrega el punto inferior, sin círculo propio', () => {
  assert.match(calendar, /\.justifiedAbsenceDay :global\(\.rdp-day_button\)::after/);
  assert.doesNotMatch(calendar, /@extend %justifiedAbsenceDay/);
  assert.doesNotMatch(calendar, /\.justifiedAbsenceDay\s+:global\(\.rdp-day_button\)\s*\{/);
});

test('los controles del calendario consumen los tokens de acento por tema', () => {
  for (const selector of ['.rdp-chevron', '.rdp-today:not(.rdp-selected) .rdp-day_button', '.rdp-selected .rdp-day_button']) {
    assert.ok(calendar.includes(selector), selector);
  }
  assert.match(calendar, /--rdp-accent-color: var\(--calendar-accent\)/);
  assert.match(calendar, /border-bottom: 1px solid var\(--border-strong\)/);
});

test('las tarjetas de Resumen y la barra inferior tienen bordes dependientes del tema', () => {
  assert.match(summary, /border-color: var\(--border-subtle\)/);
  assert.match(navbar, /border-top: 1px solid var\(--border-strong\)/);
});
