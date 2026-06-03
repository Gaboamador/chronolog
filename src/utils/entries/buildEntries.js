import {
  ABSENCE_REASONS,
  ENTRY_TYPES,
} from './entriesStatus';

export function buildWorkedEntry({ date, start, end }) {
  return {
    date,
    entryType: ENTRY_TYPES.WORKED,
    start,
    end,
  };
}

export function buildJustifiedAbsenceEntry({
  date,
  absenceReason = ABSENCE_REASONS.VACATION,
}) {
  return {
    date,
    entryType: ENTRY_TYPES.JUSTIFIED_ABSENCE,
    absenceReason,
  };
}