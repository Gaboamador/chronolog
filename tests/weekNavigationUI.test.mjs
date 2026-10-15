import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const summary = read('componentes/ResumenSemana/ResumenSemana.jsx');
const styles = read('componentes/ResumenSemana/ResumenSemana.module.scss');

test('Resumen permite recorrer semanas sin pasar por Calendario ni Jornada', () => {
  assert.match(summary, /import\s*\{[\s\S]*?addWeeks,[\s\S]*?\}\s*from 'date-fns'/);
  assert.match(summary, /const handleWeekChange = \(weekOffset\) => \{\s*context\.setSelectedDate\(\(currentDate\) => addWeeks\(currentDate, weekOffset\)\);\s*\};/);
  assert.match(summary, /onClick=\{\(\) => handleWeekChange\(-1\)\}/);
  assert.match(summary, /onClick=\{\(\) => handleWeekChange\(1\)\}/);
  assert.match(summary, /aria-label="Semana anterior"/);
  assert.match(summary, /aria-label="Semana siguiente"/);
  assert.match(summary, /aria-live="polite">\{weekLabel\}/);
});

test('La navegación conserva controles táctiles legibles y no modifica los cálculos', () => {
  assert.match(styles, /\.weekNavButton\s*\{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  assert.match(styles, /\.weekNavButton\s*\{[\s\S]*?color: var\(--text-main\)/);
  assert.match(styles, /\.weekNavButton\s*\{[\s\S]*?&:focus-visible/);
  assert.match(summary, /const monthStart = startOfMonth\(context\.selectedDate\)/);
  assert.match(summary, /const weekStart = startOfWeek\(baseDate, \{ weekStartsOn: 1 \}\)/);
  assert.match(summary, /const handleEditClick = \(row\) => setEditRow\(row\)/);
});
