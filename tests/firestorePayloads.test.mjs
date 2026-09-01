import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWorkedEntry, buildJustifiedAbsenceEntry } from '../src/utils/entries/buildEntries.js';
import { editBreakTime, normalizeBreaks } from '../src/utils/entries/timeCalculations.js';
import { buildDailyEntryPayload } from '../src/utils/entries/normalizeEntryForPersistence.js';

function findUndefined(value, path = 'payload') {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    if (child === undefined) return [childPath];
    return findUndefined(child, childPath);
  });
}

test('regresión: editar y guardar una salida transitoria nunca envía startTimestamp undefined', () => {
  const firestoreEntry = {
    date: '2026-09-01',
    entryType: 'worked',
    clockStatus: 'open',
    start: '09:00',
    end: '',
    startTimestamp: '2026-09-01T12:00:00.000Z',
    breaks: [{ start: '12:45', end: '13:00' }],
  };
  const draftBreaks = normalizeBreaks(firestoreEntry.breaks);
  const editedBreak = editBreakTime(draftBreaks[0], 'start', '12:46');

  assert.equal(Object.hasOwn(editedBreak, 'startTimestamp'), false);

  const updatedEntry = buildWorkedEntry({
    ...firestoreEntry,
    breaks: [editedBreak],
  });
  const payload = buildDailyEntryPayload(updatedEntry);

  assert.equal(payload.entries[0].breaks[0].start, '12:46');
  assert.equal(Object.hasOwn(payload.entries[0].breaks[0], 'startTimestamp'), false);
  assert.deepEqual(findUndefined(payload), []);
});

test('editar un extremo de la pausa invalida sólo su timestamp correspondiente', () => {
  const original = {
    start: '12:45',
    end: '13:00',
    startTimestamp: '2026-09-01T15:45:00.000Z',
    endTimestamp: '2026-09-01T16:00:00.000Z',
  };
  const editedStart = editBreakTime(original, 'start', '12:50');
  assert.equal(Object.hasOwn(editedStart, 'startTimestamp'), false);
  assert.equal(editedStart.endTimestamp, original.endTimestamp);

  const editedEnd = editBreakTime(original, 'end', '13:05');
  assert.equal(Object.hasOwn(editedEnd, 'endTimestamp'), false);
  assert.equal(editedEnd.startTimestamp, original.startTimestamp);
});

test('todos los estados persistibles producen payloads sin undefined', () => {
  const entries = [
    buildWorkedEntry({
      date: '2026-09-01',
      start: '09:00',
      end: '',
      clockStatus: 'open',
      startTimestamp: '2026-09-01T12:00:00.000Z',
    }),
    buildWorkedEntry({
      date: '2026-09-02',
      start: '09:00',
      end: '',
      clockStatus: 'open',
      breaks: [{
        start: '12:00',
        end: '',
        startTimestamp: '2026-09-02T15:00:00.000Z',
        endTimestamp: undefined,
      }],
    }),
    buildWorkedEntry({
      date: '2026-09-03',
      start: '09:00',
      end: '17:00',
      clockStatus: 'closed',
      startTimestamp: undefined,
      endTimestamp: undefined,
      breaks: [{ start: '12:00', end: '12:30', startTimestamp: undefined }],
    }),
    buildJustifiedAbsenceEntry({
      date: '2026-09-04',
      absenceReason: 'vacation',
    }),
  ];

  entries.forEach((entry) => {
    assert.deepEqual(findUndefined(buildDailyEntryPayload(entry)), []);
  });
});

test('la frontera Firestore rechaza estados inválidos en lugar de corregirlos silenciosamente', () => {
  assert.throws(() => buildDailyEntryPayload({
    date: '2026-09-01',
    entryType: 'worked',
    clockStatus: 'open',
    start: '09:00',
    end: '17:00',
    breaks: [],
  }), /jornada abierta no puede tener salida final/);

  assert.throws(() => buildDailyEntryPayload({
    date: '2026-09-01',
    entryType: 'worked',
    clockStatus: 'closed',
    start: '09:00',
    end: '',
    breaks: [],
  }), /jornada cerrada debe tener salida final/);
});
