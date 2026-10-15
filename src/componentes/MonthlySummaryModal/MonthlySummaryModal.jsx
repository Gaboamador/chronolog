import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiChevronUp, FiX } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { ABSENCE_REASONS, ABSENCE_REASON_LABELS } from '@/utils/entries/entriesStatus';
import { calculateLaborHistory } from '@/utils/monthlyStats';
import styles from './MonthlySummaryModal.module.scss';

const REASONS = Object.values(ABSENCE_REASONS);

export default function MonthlySummaryModal({
  isOpen,
  onClose,
  entries,
  expectedWorkMinutes,
}) {
  const years = useMemo(
    () => calculateLaborHistory(entries, expectedWorkMinutes),
    [entries, expectedWorkMinutes]
  );

  const [selectedYear, setSelectedYear] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(null);

  const availableYears = years.map((year) => year.year);
  const activeYear = availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears[0] || '');
  const activeYearIndex = availableYears.indexOf(activeYear);
  const selectedSummary = years.find((year) => year.year === activeYear);

  const selectYear = (year) => {
    setSelectedYear(year);
    setExpandedMonth(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="monthly-summary-title"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Estadísticas</p>
                <h2 id="monthly-summary-title">Historial laboral</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Cerrar historial laboral"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>

            <div className={styles.content}>
              {selectedSummary ? (
                <>
                  <div className={styles.yearToolbar}>
                    <h3>Resumen anual</h3>
                    <div className={styles.yearNavigation}>
                      <button
                        type="button"
                        className={styles.yearArrow}
                        disabled={activeYearIndex === availableYears.length - 1}
                        onClick={() => selectYear(availableYears[activeYearIndex + 1])}
                        aria-label="Ver año anterior"
                        title="Año anterior"
                      >
                        <FiChevronLeft aria-hidden="true" />
                      </button>
                      <select
                        className={styles.yearSelect}
                        value={activeYear}
                        onChange={(event) => selectYear(event.target.value)}
                        aria-label="Seleccionar año del historial"
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={styles.yearArrow}
                        disabled={activeYearIndex === 0}
                        onClick={() => selectYear(availableYears[activeYearIndex - 1])}
                        aria-label="Ver año siguiente"
                        title="Año siguiente"
                      >
                        <FiChevronRight aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className={styles.yearMetrics}>
                    <div className={styles.yearMetric}>
                      <span>Días trabajados</span>
                      <strong>{selectedSummary.workedDays}</strong>
                    </div>
                    <div className={styles.yearMetric}>
                      <span>Promedio diario</span>
                      <strong>{selectedSummary.averageLabel}</strong>
                    </div>
                    <div className={styles.yearMetric}>
                      <span>Ausencias registradas</span>
                      <strong>{selectedSummary.absenceDays}</strong>
                    </div>
                  </div>

                  <div className={styles.yearAbsences} aria-label="Ausencias del año por motivo">
                    {REASONS.map((reason) => (
                      <div key={reason} className={styles.absenceCounter}>
                        <span>{ABSENCE_REASON_LABELS[reason]}</span>
                        <strong>{selectedSummary.absenceCounts[reason]}</strong>
                      </div>
                    ))}
                  </div>

                  <div className={styles.monthsHeader}>
                    <h3>Detalle mensual</h3>
                    <span>{selectedSummary.months.length} {selectedSummary.months.length === 1 ? 'mes registrado' : 'meses registrados'}</span>
                  </div>
                  <div className={styles.monthList}>
                    {selectedSummary.months.map((month) => {
                      const expanded = expandedMonth === month.monthKey;
                      const detailId = `history-month-${month.monthKey}`;
                      const monthsWithAbsences = REASONS.filter((reason) => month.absenceCounts[reason] > 0);
                      const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long' })
                        .format(new Date(Number(month.monthKey.slice(0, 4)), Number(month.monthKey.slice(5, 7)) - 1, 1));
                      return (
                        <div key={month.monthKey} className={styles.monthItem}>
                          <button
                            type="button"
                            className={`${styles.monthTrigger} ${expanded ? styles.expanded : ""}`}
                            onClick={() => setExpandedMonth(expanded ? null : month.monthKey)}
                            aria-expanded={expanded}
                            aria-controls={detailId}
                            aria-label={`${expanded ? 'Ocultar' : 'Ver'} detalle de ${month.monthLabel}`}
                          >
                            <div className={styles.monthMain}>
                              <span className={styles.monthName}>{monthName}</span>
                              <span
                                className={`${styles.monthBalance} ${
                                  month.balanceMinutes === null ? styles.neutral :
                                  month.balanceMinutes > 0 ? styles.positive :
                                  month.balanceMinutes < 0 ? styles.negative : styles.neutral
                                }`}
                              >
                                {month.balanceLabel}
                              </span>
                            </div>
                            <div className={styles.monthSecondary}>
                              <span>{month.workedDays} {month.workedDays === 1 ? 'día trabajado' : 'días trabajados'}</span>
                              <span className={styles.secondaryDivider} aria-hidden="true">·</span>
                              <span>Prom. {month.averageLabel}</span>
                              {month.absenceDays > 0 && (
                                <>
                                  <span className={styles.secondaryDivider} aria-hidden="true">·</span>
                                  <span>{month.absenceDays} {month.absenceDays === 1 ? 'ausencia' : 'ausencias'}</span>
                                </>
                              )}
                              {expanded ? <FiChevronUp className={styles.monthChevron} aria-hidden="true" /> : <FiChevronDown className={styles.monthChevron} aria-hidden="true" />}
                            </div>
                          </button>
                          {expanded && (
                            <div id={detailId} className={styles.monthDetails}>
                              <dl className={styles.monthStats}>
                                <div><dt>Días trabajados</dt><dd>{month.workedDays}</dd></div>
                                <div><dt>Total trabajado</dt><dd>{month.totalWorkedLabel}</dd></div>
                                <div><dt>Promedio diario</dt><dd>{month.averageLabel}</dd></div>
                                <div><dt>Balance</dt><dd>{month.balanceLabel}</dd></div>
                              </dl>
                              <div className={styles.absencesSection}>
                                <h4>Ausencias registradas ({month.absenceDays})</h4>
                                {monthsWithAbsences.length > 0 ? (
                                  <dl className={styles.absenceDetails}>
                                    {monthsWithAbsences.map((reason) => (
                                      <div key={reason}>
                                        <dt>{ABSENCE_REASON_LABELS[reason]}</dt>
                                        <dd>{month.absenceCounts[reason]}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                ) : (
                                  <p>Sin ausencias registradas.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className={styles.note}>
                    Las ausencias corresponden a días registrados, no a días corridos de licencia.
                  </p>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <h3>No hay registros para mostrar todavía</h3>
                  <p>Cuando cargues jornadas o ausencias, podrás consultarlas por año y por mes.</p>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
