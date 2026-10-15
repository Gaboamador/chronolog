import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLaborHistory, calculateMonthlySummaries } from '../src/utils/monthlyStats.js';
import { ABSENCE_REASON_LABELS, ABSENCE_REASONS } from '../src/utils/entries/entriesStatus.js';

const worked = (date, start = '09:00', end = '17:00', breaks = []) => ({
  date, entryType: 'worked', clockStatus: 'closed', start, end, breaks,
});
const absent = (date, absenceReason) => ({
  date, entryType: 'justified_absence', absenceReason,
});

test('agrupa años, ordena meses y calcula promedios anuales ponderados sin cambiar el promedio mensual', () => {
  const entries = [
    worked('2025-12-10', '09:00', '17:00'),
    worked('2026-08-20', '09:00', '18:00'),
    worked('2026-08-21', '09:00', '17:00', [{ start: '12:00', end: '13:00' }]),
    worked('2026-09-01', '09:00', '17:00'),
    absent('2026-09-02', ABSENCE_REASONS.VACATION),
  ];
  const before = calculateMonthlySummaries(entries, 480);
  const [current, old] = calculateLaborHistory(entries, 480);
  assert.deepEqual([current.year, old.year], ['2026', '2025']);
  assert.deepEqual(current.months.map((m) => m.monthKey), ['2026-09', '2026-08']);
  assert.equal(current.workedDays, 3);
  assert.equal(current.totalWorkedMinutes, 1440);
  assert.equal(current.averageMinutes, 480);
  assert.equal(current.averageLabel, '8h 00m');
  assert.equal(current.absenceDays, 1);
  assert.equal(current.months[1].totalWorkedMinutes, 960);
  assert.equal(current.months[1].balanceMinutes, 0);
  assert.deepEqual(calculateMonthlySummaries(entries, 480), before);
});

test('los meses sólo con ausencias aparecen, con promedio y balance no aplicables', () => {
  const history = calculateLaborHistory([
    absent('2026-01-05', ABSENCE_REASONS.VACATION),
    absent('2026-01-06', ABSENCE_REASONS.VACATION),
    absent('2026-01-07', ABSENCE_REASONS.SICKNESS),
  ], 480);
  assert.equal(history.length, 1);
  assert.equal(history[0].workedDays, 0);
  assert.equal(history[0].averageLabel, '-');
  assert.equal(history[0].absenceDays, 3);
  assert.equal(history[0].months.length, 1);
  const january = history[0].months[0];
  assert.equal(january.monthKey, '2026-01');
  assert.equal(january.workedDays, 0);
  assert.equal(january.averageLabel, '-');
  assert.equal(january.balanceMinutes, null);
  assert.equal(january.balanceLabel, '-');
  assert.equal(january.absenceCounts.vacation, 2);
  assert.equal(january.absenceCounts.sickness, 1);
  assert.deepEqual(calculateMonthlySummaries([
    absent('2026-01-05', ABSENCE_REASONS.VACATION),
  ], 480), []);
});

test('desglosa todos los motivos oficiales sin contar fines de semana ni fechas sin registro', () => {
  const entries = [
    absent('2026-03-02', ABSENCE_REASONS.VACATION),
    absent('2026-03-03', ABSENCE_REASONS.SICKNESS),
    absent('2026-03-04', ABSENCE_REASONS.PERSONAL_DAY),
    absent('2026-03-05', ABSENCE_REASONS.OTHER),
    worked('2026-03-06'),
  ];
  const [year] = calculateLaborHistory(entries, 480);
  assert.deepEqual(Object.keys(year.absenceCounts), Object.values(ABSENCE_REASONS));
  for (const key of Object.keys(ABSENCE_REASON_LABELS)) {
    assert.equal(year.absenceCounts[key], 1);
  }
  assert.equal(year.absenceDays, 4);
  assert.equal(year.workedDays, 1);
});

test('una ausencia en diciembre y otra en enero pertenecen a años diferentes, sin sumar días corridos', () => {
  const [next, previous] = calculateLaborHistory([
    absent('2025-12-31', ABSENCE_REASONS.VACATION),
    absent('2026-01-02', ABSENCE_REASONS.VACATION),
  ], 480);
  assert.equal(next.absenceDays, 1);
  assert.equal(previous.absenceDays, 1);
  assert.equal(next.absenceCounts.vacation, 1);
  assert.equal(previous.absenceCounts.vacation, 1);
});

test('acepta entradas por fecha, motivos desconocidos como Otro y la marca histórica de ausencia', () => {
  const years = calculateLaborHistory({
    '2024-04-02': { entryType: 'justified_absence', absenceReason: 'legacy_code' },
    '2024-04-03': { justifiedAbsence: true },
    '2024-04-04': { start: '09:00', end: '17:00' },
  }, 480);
  assert.equal(years[0].absenceDays, 2);
  assert.equal(years[0].absenceCounts.other, 2);
  assert.equal(years[0].workedDays, 1);
});

test('ignora registros abiertos, fechas inválidas, objetos vacíos y devuelve [] sin datos', () => {
  assert.deepEqual(calculateLaborHistory(null, 480), []);
  const result = calculateLaborHistory([
    { date: '2026-02-10', entryType: 'worked', clockStatus: 'open', start: '09:00', end: '' },
    { date: 'invalid', entryType: 'justified_absence', absenceReason: ABSENCE_REASONS.VACATION },
    {},
    worked('2026-02-12'),
  ], 480);
  assert.equal(result.length, 1);
  assert.equal(result[0].workedDays, 1);
  assert.equal(result[0].absenceDays, 0);
});
