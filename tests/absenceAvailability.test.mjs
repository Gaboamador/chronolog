import assert from 'node:assert/strict';
import test from 'node:test';
import { canMarkAbsenceOnDate } from '../src/utils/entries/entriesStatus.js';

const date = '2026-10-15';

test('admite cargar una ausencia individual solo si el día no tiene registros', () => {
  assert.equal(canMarkAbsenceOnDate([], date), true);
  assert.equal(canMarkAbsenceOnDate([
    { date: '2026-10-14', entryType: 'worked', clockStatus: 'closed' },
  ], date), true);
  assert.equal(canMarkAbsenceOnDate([], ''), false);
});

test('impide reemplazar una jornada abierta con salidas transitorias', () => {
  const entries = [{
    date,
    entryType: 'worked',
    clockStatus: 'open',
    start: '09:12',
    end: '',
    breaks: [{ start: '12:00', end: '12:15' }],
  }];
  assert.equal(canMarkAbsenceOnDate(entries, date), false);
});

test('impide reemplazar una jornada cerrada o una ausencia ya guardada', () => {
  assert.equal(canMarkAbsenceOnDate([{
    date, entryType: 'worked', clockStatus: 'closed', start: '09:12', end: '17:12',
  }], date), false);
  assert.equal(canMarkAbsenceOnDate([{
    date, entryType: 'justified_absence', absenceReason: 'vacation',
  }], date), false);
});

test('sin entradas cargadas no habilita una acción destructiva', () => {
  assert.equal(canMarkAbsenceOnDate(undefined, date), false);
  assert.equal(canMarkAbsenceOnDate(null, date), false);
});
