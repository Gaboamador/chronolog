import { groupEntriesByDate } from './groupEntriesByDate';
import {
  ENTRY_TYPES,
  isJustifiedAbsenceEntry,
} from './entriesStatus';

function normalizeEntryForComparison(entry = {}) {
  const date = entry.date || '';

  if (isJustifiedAbsenceEntry(entry)) {
    return {
      date,
      entryType: ENTRY_TYPES.JUSTIFIED_ABSENCE,
      absenceReason: entry.absenceReason || '',
    };
  }

  return {
    date,
    start: entry.start || '',
    end: entry.end || '',
    clockStatus: entry.clockStatus || '',
  };
}

function normalizeEntriesForDate(entries = []) {
  return entries
    .map(normalizeEntryForComparison)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

export function getChangedEntryDates(previousEntries = [], currentEntries = []) {
  const previousByDate = groupEntriesByDate(previousEntries);
  const currentByDate = groupEntriesByDate(currentEntries);

  const allDates = Array.from(
    new Set([
      ...Object.keys(previousByDate),
      ...Object.keys(currentByDate),
    ])
  );

  return allDates.filter((date) => {
    const previousData = JSON.stringify(
      normalizeEntriesForDate(previousByDate[date] || [])
    );

    const currentData = JSON.stringify(
      normalizeEntriesForDate(currentByDate[date] || [])
    );

    return previousData !== currentData;
  });
}