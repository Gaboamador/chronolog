import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearMonthCaches, monthCacheKey, readAllMonthCaches, readMonthCache, writeMonthCache,
} from '../src/utils/entries/monthCache.js';
import { validateAndNormalizeBackup } from '../src/utils/entries/backupValidation.js';
import { validateWorkedEntry } from '../src/utils/entries/timeCalculations.js';
import {
  LEGACY_ARCHIVE_PREFIX,
  LEGACY_CURRENT_MONTH_PREFIX,
  LEGACY_PENDING_KEY,
  LEGACY_TIME_ENTRIES_KEY,
  archiveUnassignedLegacyEntries,
  clearMigratedLegacyEntries,
  getLegacyMigrationState,
  readLegacyCandidates,
} from '../src/utils/entries/legacyMigration.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return Array.from(this.values.keys())[index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

test('el cache mensual queda aislado por uid y mes', () => {
  const storage = new MemoryStorage();
  writeMonthCache('user-a', '2026-09', [{ date: '2026-09-01', start: '09:00', end: '17:00' }], storage);
  writeMonthCache('user-b', '2026-09', [{ date: '2026-09-02', start: '10:00', end: '18:00' }], storage);
  assert.equal(readMonthCache('user-a', '2026-09', storage)[0].date, '2026-09-01');
  assert.equal(readMonthCache('user-b', '2026-09', storage)[0].date, '2026-09-02');
  assert.equal(readMonthCache('user-a', '2026-08', storage).length, 0);
  assert.notEqual(monthCacheKey('user-a', '2026-09'), monthCacheKey('user-b', '2026-09'));
});

test('combina meses cacheados del mismo usuario y permite invalidarlos', () => {
  const storage = new MemoryStorage();
  writeMonthCache('user-a', '2026-08', [{ date: '2026-08-31', start: '09:00', end: '17:00' }], storage);
  writeMonthCache('user-a', '2026-09', [{ date: '2026-09-01', start: '09:00', end: '17:00' }], storage);
  assert.deepEqual(readAllMonthCaches('user-a', storage).map((entry) => entry.date), ['2026-08-31', '2026-09-01']);
  clearMonthCaches('user-a', storage);
  assert.equal(readAllMonthCaches('user-a', storage).length, 0);
});

test('un backup legacy se normaliza sin perder compatibilidad', () => {
  const [entry] = validateAndNormalizeBackup([
    { date: '2025-04-21', start: '09:00', end: '17:00', breaks: [] },
  ]);
  assert.equal(entry.entryType, 'worked');
  assert.equal(entry.clockStatus, 'closed');
});

test('rechaza backups duplicados o con jornadas inválidas', () => {
  assert.throws(() => validateAndNormalizeBackup([
    { date: '2026-09-01', start: '09:00', end: '17:00' },
    { date: '2026-09-01', start: '10:00', end: '18:00' },
  ]), /más de un registro/);
  assert.throws(() => validateAndNormalizeBackup([
    { date: '2026-09-01', start: '99:00', end: '17:00' },
  ]), /entrada no es válida/);
});

test('una jornada reabierta admite salida vacía y conserva pausas cerradas', () => {
  const result = validateWorkedEntry({
    date: '2026-09-01',
    entryType: 'worked',
    clockStatus: 'open',
    start: '09:00',
    end: '',
    breaks: [{ start: '12:00', end: '12:30' }],
  }, { allowOpenEntry: true });
  assert.equal(result.valid, true);
});

test('una jornada abierta no acepta una pausa abierta salvo permiso explícito', () => {
  const entry = {
    date: '2026-09-01',
    entryType: 'worked',
    clockStatus: 'open',
    start: '09:00',
    end: '',
    breaks: [{ start: '12:00', end: '' }],
  };
  assert.equal(validateWorkedEntry(entry, { allowOpenEntry: true }).valid, false);
  assert.equal(validateWorkedEntry(entry, { allowOpenEntry: true, allowOpenBreak: true }).valid, true);
});

test('la migración combina datos históricos, pendientes y una jornada abierta sin perder fechas', () => {
  const storage = new MemoryStorage();
  storage.setItem(LEGACY_TIME_ENTRIES_KEY, JSON.stringify([
    { date: '2026-08-28', start: '09:00', end: '17:00' },
    { date: '2026-08-27', entryType: 'justified_absence', absenceReason: 'vacation' },
  ]));
  storage.setItem(LEGACY_PENDING_KEY, JSON.stringify([
    { date: '2026-08-29', start: '10:00', end: '18:00' },
  ]));
  storage.setItem(`${LEGACY_CURRENT_MONTH_PREFIX}:user-a`, JSON.stringify({
    monthKey: '2026-09',
    entries: [{ date: '2026-09-01', start: '15:11', end: '', clockStatus: 'open', breaks: [] }],
  }));

  const entries = readLegacyCandidates('user-a', storage);
  assert.deepEqual(entries.map((entry) => entry.date), ['2026-08-27', '2026-08-28', '2026-08-29', '2026-09-01']);
  assert.equal(entries[0].entryType, 'justified_absence');
  assert.equal(entries[3].clockStatus, 'open');
  assert.equal(getLegacyMigrationState('user-a', storage).unassignedEntries.length, 0);
});

test('las fuentes locales sólo se limpian para su dueño después de confirmar la migración', () => {
  const storage = new MemoryStorage();
  storage.setItem(LEGACY_PENDING_KEY, JSON.stringify([{ date: '2026-08-29', start: '10:00', end: '18:00' }]));
  storage.setItem(`${LEGACY_CURRENT_MONTH_PREFIX}:user-a`, JSON.stringify({
    entries: [{ date: '2026-09-01', start: '15:11', end: '' }],
  }));

  clearMigratedLegacyEntries('user-b', storage);
  assert.ok(storage.getItem(LEGACY_PENDING_KEY));
  clearMigratedLegacyEntries('user-a', storage);
  assert.equal(storage.getItem(LEGACY_PENDING_KEY), null);
  assert.equal(storage.getItem(`${LEGACY_CURRENT_MONTH_PREFIX}:user-a`), null);
});

test('los datos sin dueño se archivan antes de salir del bloqueo de migración', () => {
  const storage = new MemoryStorage();
  storage.setItem(LEGACY_PENDING_KEY, JSON.stringify([
    { date: '2025-04-21', start: '09:00', end: '17:00' },
  ]));
  const result = archiveUnassignedLegacyEntries(storage, new Date('2026-09-01T12:00:00.000Z'));
  assert.match(result.archiveKey, new RegExp(`^${LEGACY_ARCHIVE_PREFIX}`));
  assert.equal(JSON.parse(storage.getItem(result.archiveKey)).entries.length, 1);
  assert.equal(storage.getItem(LEGACY_PENDING_KEY), null);
});

test('detecta pendingTimeEntries copiado como un único objeto y no lo deja oculto', () => {
  const storage = new MemoryStorage();
  storage.setItem(LEGACY_PENDING_KEY, JSON.stringify({
    date: '2026-09-01',
    entryType: 'worked',
    start: '18:04',
    end: '',
    clockStatus: 'open',
    breaks: [],
    startTimestamp: '2026-09-01T21:04:41.219Z',
  }));

  const state = getLegacyMigrationState('dev-user', storage);
  assert.equal(state.ownedEntries.length, 0);
  assert.equal(state.unassignedEntries.length, 1);
  assert.equal(state.unassignedEntries[0].start, '18:04');
  assert.equal(state.unassignedEntries[0].clockStatus, 'open');
});

test('revisar o descargar pendientes sin UID no retira la fuente local activa', () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify([{ date: '2026-09-01', start: '18:04', end: '', breaks: [] }]);
  storage.setItem(LEGACY_PENDING_KEY, raw);

  const preview = getLegacyMigrationState('dev-user', storage).unassignedEntries;
  assert.equal(preview.length, 1);
  assert.equal(storage.getItem(LEGACY_PENDING_KEY), raw);
});
