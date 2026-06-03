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

export const ABSENCE_REASON_LABELS = {
  [ABSENCE_REASONS.VACATION]: "Vacaciones",
  [ABSENCE_REASONS.SICKNESS]: "Enfermedad",
  [ABSENCE_REASONS.PERSONAL_DAY]: "Ausente con aviso",
  [ABSENCE_REASONS.OTHER]: "Otro",
};

export function isJustifiedAbsenceEntry(entry) {
  return entry?.entryType === ENTRY_TYPES.JUSTIFIED_ABSENCE;
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