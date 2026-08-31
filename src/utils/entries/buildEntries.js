import {
  ABSENCE_REASONS,
  CLOCK_STATUS,
  ENTRY_TYPES,
} from './entriesStatus';

export function buildWorkedEntry({
  date,
  start,
  end,
  clockStatus = CLOCK_STATUS.CLOSED,
  breaks = [],
  startTimestamp,
}) {
  return {
    date,
    entryType: ENTRY_TYPES.WORKED,
    start,
    end,
    clockStatus,
    breaks,
    ...(startTimestamp ? { startTimestamp } : {}),
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
