import { groupEntriesByDate } from './groupEntriesByDate';

export function buildEntryPayloadForDate(entries = [], date) {
  const entriesByDate = groupEntriesByDate(entries);

  return {
    date,
    entries: entriesByDate[date] || [],
  };
}