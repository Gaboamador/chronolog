import {
  ABSENCE_REASONS,
  CLOCK_STATUS,
  ENTRY_TYPES,
} from './entriesStatus.js';
import {
  buildJustifiedAbsenceEntry,
  buildWorkedEntry,
} from './buildEntries.js';
import { validateWorkedEntry } from './timeCalculations.js';

function assertOptionalTimestamp(value, field, date) {
  if (value !== undefined && (typeof value !== 'string' || Number.isNaN(Date.parse(value)))) {
    throw new Error(`${date}: ${field} no es un timestamp ISO válido.`);
  }
}

export function normalizeEntryForPersistence(entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.date || '')) {
    throw new Error('La entrada no tiene una fecha válida.');
  }

  if (entry.entryType === ENTRY_TYPES.JUSTIFIED_ABSENCE) {
    if (!Object.values(ABSENCE_REASONS).includes(entry.absenceReason)) {
      throw new Error(`${entry.date}: la ausencia no tiene un motivo válido.`);
    }
    return buildJustifiedAbsenceEntry({
      date: entry.date,
      absenceReason: entry.absenceReason,
    });
  }

  if (entry.entryType !== ENTRY_TYPES.WORKED) {
    throw new Error(`${entry.date}: el tipo de entrada no es válido.`);
  }

  if (!Object.values(CLOCK_STATUS).includes(entry.clockStatus)) {
    throw new Error(`${entry.date}: el estado de jornada no es válido.`);
  }
  if (entry.clockStatus === CLOCK_STATUS.OPEN && entry.end) {
    throw new Error(`${entry.date}: una jornada abierta no puede tener salida final.`);
  }
  if (entry.clockStatus === CLOCK_STATUS.CLOSED && !entry.end) {
    throw new Error(`${entry.date}: una jornada cerrada debe tener salida final.`);
  }

  assertOptionalTimestamp(entry.startTimestamp, 'startTimestamp', entry.date);
  assertOptionalTimestamp(entry.endTimestamp, 'endTimestamp', entry.date);
  (Array.isArray(entry.breaks) ? entry.breaks : []).forEach((workBreak, index) => {
    assertOptionalTimestamp(workBreak?.startTimestamp, `breaks[${index}].startTimestamp`, entry.date);
    assertOptionalTimestamp(workBreak?.endTimestamp, `breaks[${index}].endTimestamp`, entry.date);
  });

  const normalized = buildWorkedEntry({
    date: entry.date,
    start: entry.start,
    end: entry.end || '',
    clockStatus: entry.clockStatus,
    breaks: entry.breaks,
    startTimestamp: entry.startTimestamp,
    endTimestamp: entry.endTimestamp,
  });
  const validation = validateWorkedEntry(normalized, {
    allowOpenEntry: normalized.clockStatus === CLOCK_STATUS.OPEN,
    allowOpenBreak: normalized.clockStatus === CLOCK_STATUS.OPEN,
  });
  if (!validation.valid) {
    throw new Error(`${entry.date}: ${validation.error}`);
  }
  return normalized;
}

export function buildDailyEntryPayload(entry) {
  const normalized = normalizeEntryForPersistence(entry);
  return { date: normalized.date, entries: [normalized] };
}
