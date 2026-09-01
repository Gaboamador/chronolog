import { CLOCK_STATUS, ENTRY_TYPES } from './entriesStatus.js';
import { sortEntriesByDate } from './sortEntriesByDate.js';

export const LEGACY_PENDING_KEY = 'pendingTimeEntries';
export const LEGACY_TIME_ENTRIES_KEY = 'timeEntries';
export const LEGACY_PENDING_OWNER_KEY = 'chronolog:legacy-pending-owner';
export const LEGACY_CURRENT_MONTH_PREFIX = 'currentMonthTimeEntries';
export const LEGACY_ARCHIVE_PREFIX = 'chronolog:legacy-unassigned-archive';

export function normalizeLegacyEntries(value) {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? [value]
      : [];
  return candidates
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry?.date || '') && (
      entry?.start || entry?.entryType === ENTRY_TYPES.JUSTIFIED_ABSENCE
    ))
    .map((entry) => entry.entryType === ENTRY_TYPES.JUSTIFIED_ABSENCE
      ? { ...entry, entryType: ENTRY_TYPES.JUSTIFIED_ABSENCE }
      : {
          ...entry,
          entryType: ENTRY_TYPES.WORKED,
          clockStatus: entry.clockStatus || (entry.end ? CLOCK_STATUS.CLOSED : CLOCK_STATUS.OPEN),
          breaks: Array.isArray(entry.breaks) ? entry.breaks : [],
        });
}

function parseEntries(storage, key, select = (value) => value) {
  try {
    return normalizeLegacyEntries(select(JSON.parse(storage.getItem(key) || 'null')));
  } catch {
    return [];
  }
}

function upsertByDate(current, incoming) {
  const byDate = new Map(current.map((entry) => [entry.date, entry]));
  incoming.forEach((entry) => byDate.set(entry.date, entry));
  return sortEntriesByDate(Array.from(byDate.values()));
}

export function readGlobalLegacyEntries(storage = localStorage) {
  return upsertByDate(
    parseEntries(storage, LEGACY_TIME_ENTRIES_KEY),
    parseEntries(storage, LEGACY_PENDING_KEY)
  );
}

export function readUidLegacyEntries(uid, storage = localStorage) {
  return parseEntries(
    storage,
    `${LEGACY_CURRENT_MONTH_PREFIX}:${uid}`,
    (value) => value?.entries
  );
}

export function resolveLegacyOwner(storage = localStorage) {
  try {
    const existingOwner = storage.getItem(LEGACY_PENDING_OWNER_KEY);
    if (existingOwner) return existingOwner;
    const candidateUids = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(`${LEGACY_CURRENT_MONTH_PREFIX}:`)) {
        candidateUids.push(key.slice(LEGACY_CURRENT_MONTH_PREFIX.length + 1));
      }
    }
    if (candidateUids.length !== 1) return null;
    storage.setItem(LEGACY_PENDING_OWNER_KEY, candidateUids[0]);
    return candidateUids[0];
  } catch {
    return null;
  }
}

export function readLegacyCandidates(uid, storage = localStorage) {
  const globalEntries = resolveLegacyOwner(storage) === uid
    ? readGlobalLegacyEntries(storage)
    : [];
  // El cache mensual es el estado local más reciente para sus fechas (incluye jornadas abiertas).
  return upsertByDate(globalEntries, readUidLegacyEntries(uid, storage));
}

export function getLegacyMigrationState(uid, storage = localStorage) {
  const owner = resolveLegacyOwner(storage);
  const globalEntries = readGlobalLegacyEntries(storage);
  const ownedEntries = readLegacyCandidates(uid, storage);
  return {
    owner,
    ownedEntries,
    unassignedEntries: globalEntries.length && owner !== uid ? globalEntries : [],
  };
}

export function clearMigratedLegacyEntries(uid, storage = localStorage) {
  if (resolveLegacyOwner(storage) === uid) {
    storage.removeItem(LEGACY_PENDING_KEY);
    storage.removeItem(LEGACY_TIME_ENTRIES_KEY);
    storage.removeItem(LEGACY_PENDING_OWNER_KEY);
  }
  storage.removeItem(`${LEGACY_CURRENT_MONTH_PREFIX}:${uid}`);
}

export function archiveUnassignedLegacyEntries(storage = localStorage, now = new Date()) {
  const entries = readGlobalLegacyEntries(storage);
  if (!entries.length) return { entries: [], archiveKey: null };
  const archiveKey = `${LEGACY_ARCHIVE_PREFIX}:${now.toISOString()}`;
  storage.setItem(archiveKey, JSON.stringify({ archivedAt: now.toISOString(), entries }));
  // Primero se verifica que el archivo local haya quedado escrito; recién entonces se retira del estado activo.
  if (!storage.getItem(archiveKey)) throw new Error('No se pudo archivar el respaldo local.');
  storage.removeItem(LEGACY_PENDING_KEY);
  storage.removeItem(LEGACY_TIME_ENTRIES_KEY);
  storage.removeItem(LEGACY_PENDING_OWNER_KEY);
  return { entries, archiveKey };
}
