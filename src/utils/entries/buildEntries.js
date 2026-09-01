import {
  ABSENCE_REASONS,
  CLOCK_STATUS,
  ENTRY_TYPES,
} from './entriesStatus.js';
import { normalizeBreaks } from './timeCalculations.js';

export function buildWorkedEntry({
  date,
  start,
  end,
  clockStatus = CLOCK_STATUS.CLOSED,
  breaks = [],
  startTimestamp,
  endTimestamp,
}) {
  return {
    date,
    entryType: ENTRY_TYPES.WORKED,
    start,
    end,
    clockStatus,
    breaks: normalizeBreaks(breaks),
    ...(startTimestamp ? { startTimestamp } : {}),
    ...(endTimestamp ? { endTimestamp } : {}),
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
