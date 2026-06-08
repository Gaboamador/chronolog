import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  calculateMonthlySummaries,
  formatMinutesAsHours,
} from "@/utils/monthlyStats";
import styles from "./MonthlySummaryModal.module.scss";

export default function MonthlySummaryModal({
  isOpen,
  onClose,
  entries,
  defaultWorkTime,
}) {
  const monthlySummaries = useMemo(() => {
    return calculateMonthlySummaries(entries, defaultWorkTime);
  }, [entries, defaultWorkTime]);

  const generalAverage = useMemo(() => {
    const totalWorkedDays = monthlySummaries.reduce(
      (acc, month) => acc + month.workedDays,
      0
    );

    const totalWorkedMinutes = monthlySummaries.reduce(
      (acc, month) => acc + month.totalWorkedMinutes,
      0
    );

    if (totalWorkedDays === 0) return null;

    return Math.round(totalWorkedMinutes / totalWorkedDays);
  }, [monthlySummaries]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Historial</p>
                <h2 id="monthly-summary-title">Promedios por mes</h2>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Cerrar historial mensual"
              >
                ×
              </button>
            </div>

            <div className={styles.content}>
                {monthlySummaries.length > 0 ? (
                <>
                    <div className={styles.summaryCards}>
                    <div className={styles.summaryCard}>
                        <span>Meses registrados</span>
                        <strong>{monthlySummaries.length}</strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>Días trabajados</span>
                        <strong>
                        {monthlySummaries.reduce(
                            (acc, month) => acc + month.workedDays,
                            0
                        )}
                        </strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>Promedio general</span>
                        <strong>{formatMinutesAsHours(generalAverage)}</strong>
                    </div>
                    </div>

                    <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th>Mes</th>
                            <th>Días trabajados</th>
                            <th>Total trabajado</th>
                            <th>Promedio diario</th>
                            <th>Balance</th>
                        </tr>
                        </thead>

                        <tbody>
                        {monthlySummaries.map((month) => (
                            <tr key={month.monthKey}>
                            <td data-label="Mes">{month.monthLabel}</td>
                            <td data-label="Días trabajados">
                                {month.workedDays}
                            </td>
                            <td data-label="Total trabajado">
                                {month.totalWorkedLabel}
                            </td>
                            <td data-label="Promedio diario">
                                <strong>{month.averageLabel}</strong>
                            </td>
                            <td
                                data-label="Balance"
                                className={
                                month.balanceMinutes > 0
                                    ? styles.positive
                                    : month.balanceMinutes < 0
                                    ? styles.negative
                                    : styles.neutral
                                }
                            >
                                {month.balanceLabel}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </>
                ) : (
                <div className={styles.emptyState}>
                    <h3>No hay datos suficientes todavía</h3>
                    <p>
                    Cuando existan jornadas trabajadas cargadas, vas a ver acá el
                    promedio diario agrupado por mes.
                    </p>
                </div>
                )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}