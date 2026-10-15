import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/componentes/MonthlySummaryModal/MonthlySummaryModal.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/componentes/MonthlySummaryModal/MonthlySummaryModal.module.scss', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('Historial laboral tiene selector de año y detalle mensual expandible accesibles', () => {
  assert.match(component, /Historial laboral/);
  assert.match(component, /aria-label="Seleccionar año del historial"/);
  assert.match(component, /Ver año anterior/);
  assert.match(component, /Ver año siguiente/);
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /aria-controls=\{detailId\}/);
  assert.match(component, /ABSENCE_REASON_LABELS\[reason\]/);
  assert.match(component, /Ausencias registradas/);
  assert.match(component, /calculateLaborHistory/);
  assert.doesNotMatch(component, /<table/);
});

test('El historial mantiene el fondo de pantalla móvil, el scroll interno y los colores por tema', () => {
  assert.match(styles, /\.modal\s*\{[\s\S]*?background: var\(--surface-bg\)/);
  assert.match(styles, /@media \(max-width: 800px\)\s*\{[\s\S]*?\.modal\s*\{[\s\S]*?background: var\(--page-bg\)/);
  assert.match(styles, /\.content\s*\{[\s\S]*?overflow-y: auto/);
  assert.match(styles, /\.monthBalance/);
  assert.match(styles, /color: var\(--stat-positive\)/);
  assert.match(styles, /color: var\(--stat-negative\)/);
});

test('Resumen sigue utilizando el mismo modal; no se modifica su panel ejecutivo', () => {
  assert.match(app, /<MonthlySummaryModal[\s\S]*?isOpen=\{mostrarResumenMensual\}/);
  assert.match(app, /const allEntries = await context\.exportAllEntries\(\)/);
});
