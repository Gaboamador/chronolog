const MINUTES_PER_DAY = 24 * 60;

export function parseTimeToMinutes(value) {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function normalizeBreaks(breaks) {
  if (!Array.isArray(breaks)) return [];

  return breaks.map((workBreak) => ({
    start: typeof workBreak?.start === 'string' ? workBreak.start : '',
    end: typeof workBreak?.end === 'string' ? workBreak.end : '',
    ...(workBreak?.startTimestamp ? { startTimestamp: workBreak.startTimestamp } : {}),
    ...(workBreak?.endTimestamp ? { endTimestamp: workBreak.endTimestamp } : {}),
  }));
}

export function editBreakTime(workBreak, field, value) {
  if (field !== 'start' && field !== 'end') {
    throw new Error('Campo de salida transitoria inválido.');
  }

  const normalized = normalizeBreaks([workBreak])[0];
  const timestampField = field === 'start' ? 'startTimestamp' : 'endTimestamp';
  const { [timestampField]: omittedTimestamp, ...withoutInvalidatedTimestamp } = normalized;
  void omittedTimestamp;

  return {
    ...withoutInvalidatedTimestamp,
    [field]: value,
  };
}

export function getOpenBreak(entry) {
  return normalizeBreaks(entry?.breaks).find(
    (workBreak) => Boolean(workBreak.start) && !workBreak.end
  ) || null;
}

function toTimelineMinute(value, dayStartMinutes) {
  const parsed = parseTimeToMinutes(value);
  if (parsed === null) return null;
  return parsed < dayStartMinutes ? parsed + MINUTES_PER_DAY : parsed;
}

export function validateWorkedEntry(entry, { allowOpenBreak = false, allowOpenEntry = false } = {}) {
  const startMinutes = parseTimeToMinutes(entry?.start);
  const endMinutes = parseTimeToMinutes(entry?.end);

  if (startMinutes === null) return { valid: false, error: 'La hora de entrada no es válida.' };
  if (endMinutes === null && !allowOpenEntry) return { valid: false, error: 'La hora de salida no es válida.' };

  let dayEndMinutes = endMinutes === null
    ? startMinutes + MINUTES_PER_DAY
    : toTimelineMinute(entry.end, startMinutes);
  if (endMinutes !== null && dayEndMinutes === startMinutes) {
    return { valid: false, error: 'La entrada y la salida no pueden ser iguales.' };
  }

  const intervals = [];
  const breaks = normalizeBreaks(entry.breaks);

  for (let index = 0; index < breaks.length; index += 1) {
    const workBreak = breaks[index];
    const breakStart = toTimelineMinute(workBreak.start, startMinutes);

    if (breakStart === null) {
      return { valid: false, error: `La salida transitoria ${index + 1} no tiene una hora de inicio válida.` };
    }

    if (!workBreak.end) {
      if (allowOpenBreak && index === breaks.length - 1) continue;
      return { valid: false, error: 'Completá el reingreso antes de cerrar la jornada.' };
    }

    const breakEnd = toTimelineMinute(workBreak.end, startMinutes);
    if (breakEnd === null || breakEnd < breakStart) {
      return { valid: false, error: `El reingreso ${index + 1} no puede ser anterior a la salida transitoria.` };
    }

    if (breakStart < startMinutes || breakEnd > dayEndMinutes) {
      return { valid: false, error: 'Las salidas transitorias deben estar dentro de la jornada.' };
    }

    intervals.push({ start: breakStart, end: breakEnd });
  }

  intervals.sort((a, b) => a.start - b.start);
  for (let index = 1; index < intervals.length; index += 1) {
    if (intervals[index].start < intervals[index - 1].end) {
      return { valid: false, error: 'Las salidas transitorias no pueden superponerse.' };
    }
  }

  return { valid: true, error: null };
}

export function getBreakMinutes(entry, { includeOpenUntil = null } = {}) {
  const startMinutes = parseTimeToMinutes(entry?.start);
  if (startMinutes === null) return 0;

  return normalizeBreaks(entry?.breaks).reduce((total, workBreak) => {
    const breakStart = toTimelineMinute(workBreak.start, startMinutes);
    const effectiveEnd = workBreak.end || includeOpenUntil;
    const breakEnd = toTimelineMinute(effectiveEnd, startMinutes);

    if (breakStart === null || breakEnd === null || breakEnd < breakStart) return total;
    return total + (breakEnd - breakStart);
  }, 0);
}

export function getElapsedMinutes(entry, { endTime = null } = {}) {
  const startMinutes = parseTimeToMinutes(entry?.start);
  const effectiveEnd = entry?.end || endTime;
  const endMinutes =
    startMinutes === null
      ? null
      : toTimelineMinute(effectiveEnd, startMinutes);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return null;
  }

  return endMinutes - startMinutes;
}

export function getWorkedMinutes(entry, { endTime = null, includeOpenBreak = false } = {}) {
  const startMinutes = parseTimeToMinutes(entry?.start);
  const effectiveEnd = entry?.end || endTime;
  let endMinutes = startMinutes === null ? null : toTimelineMinute(effectiveEnd, startMinutes);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;

  const breakMinutes = getBreakMinutes(entry, {
    includeOpenUntil: includeOpenBreak ? effectiveEnd : null,
  });

  return Math.max(0, endMinutes - startMinutes - breakMinutes);
}

export function formatMinutes(totalMinutes) {
  if (typeof totalMinutes !== 'number' || Number.isNaN(totalMinutes)) return '-';
  const sign = totalMinutes < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(totalMinutes));
  return `${sign}${Math.floor(absolute / 60)}h ${String(absolute % 60).padStart(2, '0')}m`;
}

export function formatSeconds(totalSeconds) {
  if (typeof totalSeconds !== 'number' || Number.isNaN(totalSeconds)) return '--:--:--';
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function getEventMilliseconds(date, time, timestamp, journeyStart = null) {
  const timestampMs = timestamp ? new Date(timestamp).getTime() : NaN;
  let eventMs = Number.isNaN(timestampMs)
    ? new Date(`${date}T${time}:00`).getTime()
    : timestampMs;

  if (journeyStart !== null && eventMs < journeyStart) {
    eventMs += 24 * 60 * 60 * 1000;
  }

  return eventMs;
}

export function getLiveTimeSummary(entry, now = new Date()) {
  if (!entry?.date || !entry?.start) {
    return { workedSeconds: 0, currentBreakSeconds: 0 };
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const startMs = getEventMilliseconds(
    entry.date,
    entry.start,
    entry.startTimestamp
  );

  if (Number.isNaN(startMs) || Number.isNaN(nowMs)) {
    return { workedSeconds: 0, currentBreakSeconds: 0 };
  }

  let timeOutsideMs = 0;
  let currentBreakSeconds = 0;

  normalizeBreaks(entry.breaks).forEach((workBreak) => {
    if (!workBreak.start) return;
    const breakStartMs = getEventMilliseconds(
      entry.date,
      workBreak.start,
      workBreak.startTimestamp,
      startMs
    );
    const breakEndMs = workBreak.end
      ? getEventMilliseconds(
          entry.date,
          workBreak.end,
          workBreak.endTimestamp,
          breakStartMs
        )
      : nowMs;
    const durationMs = Math.max(0, breakEndMs - breakStartMs);
    timeOutsideMs += durationMs;
    if (!workBreak.end) currentBreakSeconds = Math.floor(durationMs / 1000);
  });

  return {
    workedSeconds: Math.floor(Math.max(0, nowMs - startMs - timeOutsideMs) / 1000),
    currentBreakSeconds,
  };
}

export function getExpectedWorkMinutes(defaultWorkTime, fallback = 8 * 60) {
  if (typeof defaultWorkTime === 'number' && defaultWorkTime > 0) {
    return defaultWorkTime;
  }

  if (typeof defaultWorkTime === 'string') {
    const parsed = parseTimeToMinutes(defaultWorkTime);
    return parsed !== null && parsed > 0 ? parsed : fallback;
  }

  if (typeof defaultWorkTime?.minutes === 'number' && defaultWorkTime.minutes > 0) {
    return defaultWorkTime.minutes;
  }

  const start = defaultWorkTime?.defaultPersonalStartTime || defaultWorkTime?.start;
  const end = defaultWorkTime?.defaultPersonalEndTime || defaultWorkTime?.end;
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === null || endMinutes === null) return fallback;
  const duration = endMinutes <= startMinutes
    ? endMinutes + MINUTES_PER_DAY - startMinutes
    : endMinutes - startMinutes;

  return duration > 0 ? duration : fallback;
}
