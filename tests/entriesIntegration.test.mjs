import assert from 'node:assert/strict';
import test from 'node:test';
import { getChangedEntryDates } from '../src/utils/entries/getChangedEntryDates.js';
import { calculateMonthlySummaries } from '../src/utils/monthlyStats.js';

test('detecta una modificación estructural en las salidas', () => {
  const previous = [{
    date: '2026-08-31',
    start: '09:00',
    end: '17:00',
    clockStatus: 'closed',
    breaks: [],
  }];
  const current = [{
    ...previous[0],
    breaks: [{ start: '14:00', end: '14:30' }],
  }];

  assert.deepEqual(getChangedEntryDates(previous, current), ['2026-08-31']);
});

test('el resumen mensual descuenta las salidas y conserva registros históricos', () => {
  const summaries = calculateMonthlySummaries([
    { date: '2026-08-30', start: '09:00', end: '17:00' },
    {
      date: '2026-08-31',
      start: '09:00',
      end: '17:00',
      breaks: [{ start: '14:00', end: '14:30' }],
    },
  ], { start: '09:00', end: '17:00' });

  assert.equal(summaries[0].workedDays, 2);
  assert.equal(summaries[0].totalWorkedMinutes, 930);
  assert.equal(summaries[0].averageMinutes, 465);
  assert.equal(summaries[0].balanceMinutes, -30);
});
