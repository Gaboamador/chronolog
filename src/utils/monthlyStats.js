import { getWorkedMinutes } from './entries/timeCalculations.js';

function getEntryDate(entry, fallbackDate) {
  const date = entry?.date || fallbackDate;

  if (typeof date !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return date;
}

function normalizeEntries(entries) {
  if (!entries) return [];

  if (Array.isArray(entries)) {
    return entries.map((entry) => ({
      entry,
      fallbackDate: entry?.date,
    }));
  }

  return Object.entries(entries).map(([date, entry]) => ({
    entry,
    fallbackDate: date,
  }));
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  const label = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMinutesAsHours(totalMinutes) {
  if (typeof totalMinutes !== "number" || Number.isNaN(totalMinutes)) {
    return "-";
  }

  const sign = totalMinutes < 0 ? "-" : "";
  const absoluteMinutes = Math.abs(Math.round(totalMinutes));

  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatBalanceMinutes(totalMinutes) {
  if (typeof totalMinutes !== "number" || Number.isNaN(totalMinutes)) {
    return "-";
  }

  if (totalMinutes === 0) return "0h 00m";

  const prefix = totalMinutes > 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(Math.round(totalMinutes));

  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${prefix}${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function calculateMonthlySummaries(entries, expectedDailyMinutes) {
  const groupedByMonth = new Map();

  normalizeEntries(entries).forEach(({ entry, fallbackDate }) => {
    if (!entry || entry.justifiedAbsence) return;

    const date = getEntryDate(entry, fallbackDate);
    if (!date) return;

    const workedMinutes = getWorkedMinutes(entry);
    if (workedMinutes === null) return;

    const monthKey = date.slice(0, 7);

    if (!groupedByMonth.has(monthKey)) {
      groupedByMonth.set(monthKey, {
        monthKey,
        monthLabel: getMonthLabel(monthKey),
        workedDays: 0,
        totalWorkedMinutes: 0,
      });
    }

    const monthSummary = groupedByMonth.get(monthKey);

    monthSummary.workedDays += 1;
    monthSummary.totalWorkedMinutes += workedMinutes;
  });

  return Array.from(groupedByMonth.values())
    .map((monthSummary) => {
      const averageMinutes =
        monthSummary.workedDays > 0
          ? Math.round(
              monthSummary.totalWorkedMinutes / monthSummary.workedDays
            )
          : 0;

      const expectedMinutes =
        expectedDailyMinutes !== null
          ? expectedDailyMinutes * monthSummary.workedDays
          : null;

      const balanceMinutes =
        expectedMinutes !== null
          ? monthSummary.totalWorkedMinutes - expectedMinutes
          : null;

      return {
        ...monthSummary,
        averageMinutes,
        balanceMinutes,
        totalWorkedLabel: formatMinutesAsHours(monthSummary.totalWorkedMinutes),
        averageLabel: formatMinutesAsHours(averageMinutes),
        balanceLabel:
          balanceMinutes !== null ? formatBalanceMinutes(balanceMinutes) : "-",
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
