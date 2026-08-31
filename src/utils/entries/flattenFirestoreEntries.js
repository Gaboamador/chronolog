export function flattenFirestoreEntries(items = []) {
  return items.flatMap((item) => {
    if (!item?.date) return [];

    const nestedEntries = Array.isArray(item.entries) ? item.entries : [];

    if (nestedEntries.length === 0) {
      return [];
    }

    return nestedEntries.map((entry) => ({
      ...entry,
      date: entry?.date || item.date,
      ...(!entry?.entryType || entry.entryType === 'worked'
        ? { breaks: Array.isArray(entry?.breaks) ? entry.breaks : [] }
        : {}),
    }));
  });
}
