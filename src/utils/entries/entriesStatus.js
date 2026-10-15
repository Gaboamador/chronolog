export const ENTRY_TYPES = {
  WORKED: "worked",
  JUSTIFIED_ABSENCE: "justified_absence",
};

export const ABSENCE_REASONS = {
  VACATION: "vacation",
  SICKNESS: "sickness",
  PERSONAL_DAY: "personal_day",
  OTHER: "other",
};

export const CLOCK_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
};

export const ABSENCE_REASON_LABELS = {
  [ABSENCE_REASONS.VACATION]: "Vacaciones",
  [ABSENCE_REASONS.SICKNESS]: "Enfermedad",
  [ABSENCE_REASONS.PERSONAL_DAY]: "Ausente con aviso",
  [ABSENCE_REASONS.OTHER]: "Otro",
};

// Una ausencia individual solo puede cargarse en una fecha sin registros.
// Evita reemplazar una jornada abierta (incluidas sus salidas transitorias).
export function canMarkAbsenceOnDate(entries, date) {
  return Boolean(date) && Array.isArray(entries) &&
    !entries.some((entry) => entry?.date === date);
}

export function isJustifiedAbsenceEntry(entry) {
  return entry?.entryType === ENTRY_TYPES.JUSTIFIED_ABSENCE;
}

export function isOpenWorkedEntry(entry) {
  return (
    entry?.entryType === ENTRY_TYPES.WORKED &&
    entry?.clockStatus === CLOCK_STATUS.OPEN &&
    Boolean(entry?.start)
  );
}

export function isWorkedEntry(entry) {
  return (
    !isJustifiedAbsenceEntry(entry) &&
    Boolean(entry?.start) &&
    Boolean(entry?.end)
  );
}

export function isResolvedEntry(entry) {
  return isWorkedEntry(entry) || isJustifiedAbsenceEntry(entry);
}

export function countsForAverage(entry) {
  return isWorkedEntry(entry);
}

export function getAbsenceReasonLabel(reason) {
  return ABSENCE_REASON_LABELS[reason] || ABSENCE_REASON_LABELS[ABSENCE_REASONS.OTHER];
}