import React, { useContext, useMemo, useState } from 'react';
import Context from '@/context';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  isSameDay,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MdEdit } from "react-icons/md";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  countsForAverage,
  getAbsenceReasonLabel,
  isJustifiedAbsenceEntry,
  isResolvedEntry,
  isWorkedEntry,
} from '@/utils/entries/entriesStatus';
import {
  formatMinutes as formatWorkedMinutes,
  getBreakMinutes,
  getWorkedMinutes,
} from '@/utils/entries/timeCalculations';
import EditorRegistro from '@/componentes/EditorRegistro';
import styles from './ResumenSemana.module.scss';

const WEEK_DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
];

function getEntryForDate(entries, date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  return entries.find(e => e.date === dateStr);
}

function formatDuration(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m}m`;
}

function formatDurationPlain(minutes) {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h ${m}m`;
}

function getDiffBadgeClass(diff) {
  if (diff < 0) return `${styles.diffBadge} ${styles.diffNegative}`;
  if (diff > 0) return `${styles.diffBadge} ${styles.diffPositive}`;
  return `${styles.diffBadge} ${styles.diffNeutral}`;
}

function averageRealDuration(totalDiffMinutes, count, workdayMinutes) {
  if (!count) return 0;
  return workdayMinutes + Math.round(totalDiffMinutes / count);
}

function getWorkedEntryDiff(entry, workdayMinutes) {
  if (!isWorkedEntry(entry)) return 0;
  return (getWorkedMinutes(entry) || 0) - workdayMinutes;
}

function getWorkedEntryDuration(entry) {
  if (!isWorkedEntry(entry)) return 0;
  return getWorkedMinutes(entry) || 0;
}

const ResumenSemana = ({ onSelectDate, onOpenMonthlySummary }) => {
  const context = useContext(Context);
  const [editRow, setEditRow] = useState(null);
  const workdayMinutes = context.expectedWorkMinutes;

  const monthStart = startOfMonth(context.selectedDate);
  const monthEnd = endOfMonth(context.selectedDate);

  const entriesThisMonth = context.entries.filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
  });

  let totalMonthlyDiff = 0;
  let validMonthlyEntriesCount = 0;

  entriesThisMonth.forEach(entry => {
    if (countsForAverage(entry)) {
      totalMonthlyDiff += getWorkedEntryDiff(entry, workdayMinutes);
      validMonthlyEntriesCount += 1;
    }
  });

  const averageMonthlyDuration = averageRealDuration(
    totalMonthlyDiff,
    validMonthlyEntriesCount,
    workdayMinutes
  );

  const selectedMonthName = format(context.selectedDate, 'MMMM', { locale: es });
  const selectedMonthYear = format(context.selectedDate, 'yyyy');
  const monthlyBalanceDescription = validMonthlyEntriesCount === 0
    ? 'Sin jornadas registradas'
    : totalMonthlyDiff > 0
      ? 'Tiempo a favor'
      : totalMonthlyDiff < 0
        ? 'Tiempo por recuperar'
        : 'En equilibrio';
  const monthlyBalanceTone = totalMonthlyDiff > 0
    ? styles.monthBalancePositive
    : totalMonthlyDiff < 0
      ? styles.monthBalanceNegative
      : styles.monthBalanceNeutral;

  const weekDays = useMemo(() => {
    if (!context.selectedDate) return [];

    const baseDate = new Date(context.selectedDate);
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });

    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [context.selectedDate]);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[4];
  const weekLabel = weekStart && weekEnd
    ? weekStart.getFullYear() !== weekEnd.getFullYear()
      ? `${format(weekStart, "d 'de' MMMM 'de' yyyy", { locale: es })} al ${format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: es })}`
      : weekStart.getMonth() !== weekEnd.getMonth()
        ? `${format(weekStart, "d 'de' MMMM", { locale: es })} al ${format(weekEnd, "d 'de' MMMM", { locale: es })}`
        : `${format(weekStart, 'd')} al ${format(weekEnd, "d 'de' MMMM", { locale: es })}`
    : '';

  const tableRows = weekDays.map((date, idx) => {
    const entry = getEntryForDate(context.entries, date);

    const worked = isWorkedEntry(entry);
    const justifiedAbsence = isJustifiedAbsenceEntry(entry);
    const resolved = isResolvedEntry(entry);

    const duration = worked ? getWorkedEntryDuration(entry) : 0;
    const diff = worked ? duration - workdayMinutes : 0;

    return {
      day: WEEK_DAYS[idx],
      start: worked ? entry.start : '',
      end: worked ? entry.end : '',
      duration,
      diff,
      breakMinutes: worked ? getBreakMinutes(entry) : 0,
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      entry,
      worked,
      justifiedAbsence,
      resolved,
      absenceLabel: justifiedAbsence
        ? getAbsenceReasonLabel(entry.absenceReason)
        : '',
    };
  });

  const handleEditClick = (row) => setEditRow(row);

  const handleWeekChange = (weekOffset) => {
    context.setSelectedDate((currentDate) => addWeeks(currentDate, weekOffset));
  };

  return (
    <div className={styles.containerMain}>
      <div data-pane="summary-content">
      <div className={styles.titleWrapper}>
        <div className={styles.monthOverview}>
          <div className={styles.monthOverviewHeader}>
            <div className={styles.monthPeriod}>
              <span className={styles.monthEyebrow}>Resumen mensual</span>
              <h2 className={styles.monthTitle}>{selectedMonthName} {selectedMonthYear}</h2>
            </div>
            <button
              type="button"
              className={styles.monthAverageLink}
              onClick={onOpenMonthlySummary}
              aria-label="Ver promedios mensuales"
            >
              <span>Ver historial</span>
              <FiChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className={styles.monthMetrics}>
            <div className={styles.monthMetric}>
              <span className={styles.metricLabel}>Diferencia mensual</span>
              <span className={`${styles.metricValue} ${monthlyBalanceTone}`}>
                {formatDuration(totalMonthlyDiff)}
              </span>
              <span className={styles.metricDescription}>{monthlyBalanceDescription}</span>
            </div>
            <div className={styles.monthMetric}>
              <span className={styles.metricLabel}>Promedio mensual</span>
              <span className={styles.metricValue}>
                {formatDurationPlain(averageMonthlyDuration)}
              </span>
              <span className={styles.metricDescription}>Por día trabajado</span>
            </div>
          </div>
        </div>

        <div className={styles.weekPeriod}>
          <div className={styles.weekHeading}>
            <div className={styles.weekPeriodText}>
              <span className={styles.weekEyebrow}>Semana laboral · {weekStart && format(weekStart, 'yyyy')}</span>
              <h3 className={styles.weekTitle} aria-live="polite">{weekLabel}</h3>
            </div>
            <div className={styles.weekNavigation} role="group" aria-label="Navegación semanal">
              <button
                type="button"
                className={styles.weekNavButton}
                onClick={() => handleWeekChange(-1)}
                aria-label="Semana anterior"
                title="Semana anterior"
              >
                <FiChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.weekNavButton}
                onClick={() => handleWeekChange(1)}
                aria-label="Semana siguiente"
                title="Semana siguiente"
              >
                <FiChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.weeklySummaryTable}>
          <thead>
            <tr>
              <th>Día</th>
              <th>Ingreso</th>
              <th>Salida</th>
              <th>Fuera</th>
              <th>Diferencia</th>
              <th className={styles.actionsColumn}>
                <span className={styles.visuallyHidden}>Acciones</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {tableRows.map((row) => {
              if (!row.date) return null;

              const isSelected = isSameDay(row.date, context.selectedDate);

              return (
                <tr
                  key={row.dateStr}
                  className={isSelected ? styles.selected : ''}
                  onClick={() => {
                    context.setSelectedDate(row.date);
                    onSelectDate?.();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td data-label="Día">{row.day} {row.date.getDate()}</td>

                  {row.justifiedAbsence ? (
                    <>
                      <td colSpan={3} data-label="Motivo">
                        {row.absenceLabel}
                      </td>
                      <td data-label="Diferencia">—</td>
                    </>
                  ) : (
                    <>
                      <td data-label="Ingreso">
                        {row.worked ? row.start : <span className={styles.mutedCell}>-</span>}
                      </td>
                      <td data-label="Salida">
                        {row.worked ? row.end : <span className={styles.mutedCell}>-</span>}
                      </td>
                      <td data-label="Fuera">
                        {row.worked ? formatWorkedMinutes(row.breakMinutes) : <span className={styles.mutedCell}>-</span>}
                      </td>
                      <td data-label="Diferencia">
                        {row.worked ? (
                          <span className={getDiffBadgeClass(row.diff)}>
                            {formatDuration(row.diff)}
                          </span>
                        ) : (
                          <span className={styles.mutedCell}>-</span>
                        )}
                      </td>
                    </>
                  )}

                  <td className={styles.actionsColumn} data-label="Acciones">
                    {row.resolved && (
                      <button
                        type="button"
                        className={styles.editButton}
                        aria-label={`Editar carga de ${row.day} ${row.date.getDate()}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditClick(row);
                        }}
                      >
                        <MdEdit aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>

      </div>
      </div>

      <EditorRegistro
        isOpen={Boolean(editRow)}
        dateStr={editRow?.dateStr}
        entry={editRow?.entry}
        onClose={() => setEditRow(null)}
      />
    </div>
  );
};

export default ResumenSemana;
