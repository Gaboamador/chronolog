export function sortEntriesByDate(entries = []) {
  return [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
}