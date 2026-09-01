import { CLOCK_STATUS, ENTRY_TYPES } from './entriesStatus.js';
import { validateWorkedEntry } from './timeCalculations.js';

export function validateAndNormalizeBackup(value) {
  if (!Array.isArray(value)) throw new Error('El backup debe contener una lista de registros.');
  const dates = new Set();
  const entries = value.map((raw, index) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw?.date || '')) {
      throw new Error(`El registro ${index + 1} no tiene una fecha válida.`);
    }
    if (dates.has(raw.date)) throw new Error(`El backup contiene más de un registro para ${raw.date}.`);
    dates.add(raw.date);

    if (raw.entryType === ENTRY_TYPES.JUSTIFIED_ABSENCE) {
      if (!raw.absenceReason) throw new Error(`La ausencia de ${raw.date} no tiene motivo.`);
      return { date: raw.date, entryType: ENTRY_TYPES.JUSTIFIED_ABSENCE, absenceReason: raw.absenceReason };
    }

    const entry = {
      ...raw,
      entryType: ENTRY_TYPES.WORKED,
      clockStatus: raw.end ? CLOCK_STATUS.CLOSED : CLOCK_STATUS.OPEN,
      end: raw.end || '',
      breaks: Array.isArray(raw.breaks) ? raw.breaks : [],
    };
    const validation = validateWorkedEntry(entry, {
      allowOpenEntry: !entry.end,
      allowOpenBreak: !entry.end,
    });
    if (!validation.valid) throw new Error(`${raw.date}: ${validation.error}`);
    return entry;
  });
  return entries;
}
