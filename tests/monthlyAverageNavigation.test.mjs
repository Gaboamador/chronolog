import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const app = read('App.jsx');
const appStyles = read('App.scss');
const summary = read('componentes/ResumenSemana/ResumenSemana.jsx');
const summaryStyles = read('componentes/ResumenSemana/ResumenSemana.module.scss');

test('Resumen prioriza diferencia y promedio mensual antes de la semana', () => {
  const index = (fragment) => summary.indexOf(fragment);
  assert.ok(index('className={styles.monthOverview}') >= 0);
  assert.ok(index('Diferencia mensual') < index('Promedio mensual'));
  assert.ok(index('Promedio mensual') < index('className={styles.weekPeriod}'));
  assert.ok(index('className={styles.weekPeriod}') < index('className={styles.tableResponsive}'));
  assert.match(summary, /\{formatDuration\(totalMonthlyDiff\)\}/);
  assert.match(summary, /\{formatDurationPlain\(averageMonthlyDuration\)\}/);
  assert.doesNotMatch(summary, /weeklySummarySubfooter/);
  assert.doesNotMatch(summaryStyles, /\.weeklySummarySubfooter/);
});

test('El historial es un acceso secundario dentro del encabezado mensual', () => {
  assert.match(summary, /className=\{styles\.monthOverviewHeader\}[\s\S]*?className=\{styles\.monthPeriod\}[\s\S]*?className=\{styles\.monthAverageLink\}/);
  assert.match(summary, /Ver historial/);
  assert.match(summary, /aria-label="Ver promedios mensuales"/);
  assert.doesNotMatch(app, /monthlySummaryTriggerContainer|Promedios por mes/);
  assert.doesNotMatch(appStyles, /monthly-summary-trigger|monthlySummaryTriggerContainer/);
  assert.match(summaryStyles, /\.monthOverview\s*\{\s*min-width: 0;\s*\}/);
  assert.doesNotMatch(summaryStyles, /\.monthAverage\s*\{/);
});

test('Se conserva el cálculo original de los dos indicadores', () => {
  assert.match(summary, /if \(countsForAverage\(entry\)\)\s*\{\s*totalMonthlyDiff \+= getWorkedEntryDiff\(entry, workdayMinutes\);\s*validMonthlyEntriesCount \+= 1;/);
  assert.match(summary, /const averageMonthlyDuration = averageRealDuration\(\s*totalMonthlyDiff,\s*validMonthlyEntriesCount,\s*workdayMinutes\s*\)/);
  assert.match(summary, /monthlyBalanceDescription = validMonthlyEntriesCount === 0[\s\S]*?'Tiempo a favor'[\s\S]*?'Tiempo por recuperar'[\s\S]*?'En equilibrio'/);
  assert.match(summaryStyles, /\.monthBalancePositive \{ color: var\(--stat-positive\); \}/);
  assert.match(summaryStyles, /\.monthBalanceNegative \{ color: var\(--stat-negative\); \}/);
});

test('Resumen reutiliza el handler del historial y mantiene el modal original', () => {
  assert.match(app, /onOpenMonthlySummary=\{handleOpenMonthlySummary\}/);
  assert.match(summary, /onClick=\{onOpenMonthlySummary\}/);
  assert.match(app, /const allEntries = await context\.exportAllEntries\(\)/);
  assert.match(app, /<MonthlySummaryModal[\s\S]*?isOpen=\{mostrarResumenMensual\}/);
});

test('El historial es accesible y el diseño ejecutivo responde a móvil y temas', () => {
  assert.match(summary, /<button\s+type="button"\s+className=\{styles\.monthAverageLink\}/);
  assert.match(summaryStyles, /\.monthAverageLink\s*\{[\s\S]*?min-height: 44px;/);
  assert.match(summaryStyles, /\.monthAverageLink\s*\{[\s\S]*?color: var\(--text-muted\);/);
  assert.match(summaryStyles, /\.monthAverageLink\s*\{[\s\S]*?&:focus-visible/);
  assert.match(summaryStyles, /\.monthMetrics\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(summaryStyles, /\.weekPeriod\s*\{[\s\S]*?border-top: 1px solid var\(--border-strong\)/);
  assert.match(summaryStyles, /@media \(max-width: 800px\) \{[\s\S]*?\.metricValue \{ font-size: clamp/);
});
