export function groupEntriesByDate(entries = []) {
  return entries.reduce((acc, entry) => {
    const date = entry.date;

    if (!date) return acc;

    if (!acc[date]) {
      acc[date] = [];
    }

    acc[date].push(entry);

    return acc;
  }, {});
}