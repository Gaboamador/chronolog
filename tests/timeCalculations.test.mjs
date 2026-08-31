import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBreakMinutes,
  getOpenBreak,
  getWorkedMinutes,
  getLiveTimeSummary,
  normalizeBreaks,
  validateWorkedEntry,
} from '../src/utils/entries/timeCalculations.js';

test('mantiene compatibilidad con jornadas históricas sin salidas', () => {
  const entry = { start: '09:00', end: '17:00' };
  assert.deepEqual(normalizeBreaks(entry.breaks), []);
  assert.equal(getWorkedMinutes(entry), 480);
  assert.equal(validateWorkedEntry(entry).valid, true);
});

test('descuenta una salida transitoria del total trabajado', () => {
  const entry = {
    start: '09:00',
    end: '17:00',
    breaks: [{ start: '14:00', end: '14:30' }],
  };
  assert.equal(getBreakMinutes(entry), 30);
  assert.equal(getWorkedMinutes(entry), 450);
});

test('descuenta varias salidas transitorias', () => {
  const entry = {
    start: '09:00',
    end: '17:00',
    breaks: [
      { start: '11:00', end: '11:15' },
      { start: '14:00', end: '14:30' },
    ],
  };
  assert.equal(getBreakMinutes(entry), 45);
  assert.equal(getWorkedMinutes(entry), 435);
});

test('acepta una salida y reingreso dentro del mismo minuto', () => {
  const entry = {
    start: '18:02',
    end: '18:20',
    breaks: [
      { start: '18:02', end: '18:03' },
      { start: '18:03', end: '18:03' },
    ],
  };
  assert.equal(validateWorkedEntry(entry).valid, true);
  assert.equal(getBreakMinutes(entry), 1);
  assert.equal(getWorkedMinutes(entry), 17);
});

test('detecta una salida abierta y no permite cerrar la jornada', () => {
  const entry = {
    start: '09:00',
    end: '17:00',
    breaks: [{ start: '14:00', end: '' }],
  };
  assert.deepEqual(getOpenBreak(entry), { start: '14:00', end: '' });
  assert.equal(validateWorkedEntry(entry).valid, false);
});

test('rechaza salidas superpuestas o fuera de la jornada', () => {
  const overlapping = {
    start: '09:00',
    end: '17:00',
    breaks: [
      { start: '12:00', end: '13:00' },
      { start: '12:30', end: '13:30' },
    ],
  };
  const outside = {
    start: '09:00',
    end: '17:00',
    breaks: [{ start: '08:30', end: '09:15' }],
  };
  assert.equal(validateWorkedEntry(overlapping).valid, false);
  assert.equal(validateWorkedEntry(outside).valid, false);
});

test('calcula correctamente una jornada que cruza medianoche', () => {
  const entry = {
    start: '22:00',
    end: '06:00',
    breaks: [{ start: '01:00', end: '01:30' }],
  };
  assert.equal(validateWorkedEntry(entry).valid, true);
  assert.equal(getWorkedMinutes(entry), 450);
});

test('calcula en vivo tiempo trabajado y salida actual con precisión de segundos', () => {
  const entry = {
    date: '2026-08-31',
    start: '09:00',
    startTimestamp: '2026-08-31T09:00:15.000Z',
    breaks: [
      {
        start: '10:00',
        end: '10:15',
        startTimestamp: '2026-08-31T10:00:15.000Z',
        endTimestamp: '2026-08-31T10:15:15.000Z',
      },
      {
        start: '11:45',
        end: '',
        startTimestamp: '2026-08-31T11:45:15.000Z',
      },
    ],
  };

  const summary = getLiveTimeSummary(entry, new Date('2026-08-31T12:00:15.000Z'));
  assert.equal(summary.workedSeconds, 9000);
  assert.equal(summary.currentBreakSeconds, 900);
});
