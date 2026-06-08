import React, { useContext, useMemo, useState } from 'react';
import Context from '@/context';
import ConfirmModal from '@/componentes/ConfirmModal';
import { motion } from "framer-motion";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  differenceInMinutes,
  parse,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MdEdit } from "react-icons/md";
import ModalEditar from '@/componentes/ModalEditar';
import { useToast } from '@/context/ToastContext';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
  ENTRY_TYPES,
  countsForAverage,
  getAbsenceReasonLabel,
  isJustifiedAbsenceEntry,
  isResolvedEntry,
  isWorkedEntry,
} from '@/utils/entries/entriesStatus';
import {
  buildJustifiedAbsenceEntry,
  buildWorkedEntry,
} from '@/utils/entries/buildEntries';
import buttonStyles from '@/styles/Botones.module.scss';
import modalStyles from '@/componentes/ModalEditar/ModalEditar.module.scss';
import styles from './ResumenSemana.module.scss';

const WEEK_DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
];

const WORKDAY_MINUTES = 8 * 60;

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

function averageRealDuration(totalDiffMinutes, count) {
  if (!count) return 0;
  return WORKDAY_MINUTES + Math.round(totalDiffMinutes / count);
}

function getWorkedEntryDiff(entry) {
  if (!isWorkedEntry(entry)) return 0;

  const entryDate = parseISO(entry.date);
  const startDate = parse(entry.start, 'HH:mm', entryDate);
  const endDate = parse(entry.end, 'HH:mm', entryDate);
  const duration = differenceInMinutes(endDate, startDate);

  return duration - WORKDAY_MINUTES;
}

function getWorkedEntryDuration(entry, fallbackDate) {
  if (!isWorkedEntry(entry)) return 0;

  const entryDate = entry.date ? parseISO(entry.date) : fallbackDate;
  const startDate = parse(entry.start, 'HH:mm', entryDate);
  const endDate = parse(entry.end, 'HH:mm', entryDate);

  return differenceInMinutes(endDate, startDate);
}

const ResumenSemana = () => {
  const context = useContext(Context);
  const { showToast } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editDate, setEditDate] = useState(null);
  const [editMode, setEditMode] = useState(null);

  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const [editAbsenceReason, setEditAbsenceReason] = useState(ABSENCE_REASONS.VACATION);

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
      totalMonthlyDiff += getWorkedEntryDiff(entry);
      validMonthlyEntriesCount += 1;
    }
  });

  const averageMonthlyDuration = averageRealDuration(
    totalMonthlyDiff,
    validMonthlyEntriesCount
  );

  const selectedMonthName = format(context.selectedDate, 'MMMM', { locale: es });

  const weekDays = useMemo(() => {
    if (!context.selectedDate) return [];

    const baseDate = new Date(context.selectedDate);
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });

    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [context.selectedDate]);

  const tableRows = weekDays.map((date, idx) => {
    const entry = getEntryForDate(context.entries, date);

    const worked = isWorkedEntry(entry);
    const justifiedAbsence = isJustifiedAbsenceEntry(entry);
    const resolved = isResolvedEntry(entry);

    const duration = worked ? getWorkedEntryDuration(entry, date) : 0;
    const diff = worked ? duration - WORKDAY_MINUTES : 0;

    return {
      day: WEEK_DAYS[idx],
      start: worked ? entry.start : '',
      end: worked ? entry.end : '',
      duration,
      diff,
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

  const totalDiff = tableRows.reduce((sum, row) => {
    return sum + (row.worked ? row.diff : 0);
  }, 0);

  const resetEditState = () => {
    setModalOpen(false);
    setEditDate(null);
    setEditMode(null);
    setEditStart('');
    setEditEnd('');
    setEditAbsenceReason(ABSENCE_REASONS.VACATION);
  };

  const handleEditClick = (row) => {
    setEditDate(row.dateStr);

    if (row.justifiedAbsence) {
      setEditMode(ENTRY_TYPES.JUSTIFIED_ABSENCE);
      setEditAbsenceReason(row.entry.absenceReason || ABSENCE_REASONS.VACATION);
      setEditStart('');
      setEditEnd('');
    } else {
      setEditMode(ENTRY_TYPES.WORKED);
      setEditStart(row.start);
      setEditEnd(row.end);
      setEditAbsenceReason(ABSENCE_REASONS.VACATION);
    }

    setModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editDate) return;

    const filteredEntries = context.entries.filter(e => e.date !== editDate);

    if (editMode === ENTRY_TYPES.WORKED) {
      if (!editStart || !editEnd) {
        showToast('Completá entrada y salida para guardar el horario.', 'warning');
        return;
      }

    filteredEntries.push(
      buildWorkedEntry({
        date: editDate,
        start: editStart,
        end: editEnd,
      })
    );
    }

    if (editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE) {
    filteredEntries.push(
      buildJustifiedAbsenceEntry({
        date: editDate,
        absenceReason: editAbsenceReason,
      })
    );
    }

    context.setEntries(filteredEntries);
    resetEditState();
  };

  const handleDeleteEdit = () => {
    if (!editDate) return;

    setConfirmDeleteOpen(true);
  };
  const handleConfirmDeleteEdit = () => {
    if (!editDate) return;

    const filteredEntries = context.entries.filter(e => e.date !== editDate);

    context.setEntries(filteredEntries);

    showToast(
      editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE
        ? 'Ausencia eliminada. Cargá cambios para sincronizar.'
        : 'Entrada eliminada. Cargá cambios para sincronizar.',
      'success'
    );

    setConfirmDeleteOpen(false);
    resetEditState();
  };

  const handleCancelDeleteEdit = () => {
    setConfirmDeleteOpen(false);
  };

  const handleCancelEdit = () => {
    resetEditState();
  };

  const handleUploadEntries = async () => {
    try {
      const result = await context.uploadEntriesToFirebase();

      const savedCount = result?.savedCount || 0;
      const deletedCount = result?.deletedCount || 0;
      const changedCount = savedCount + deletedCount;

      if (changedCount === 0) {
        showToast('No hay cambios pendientes para cargar.', 'info');
        return;
      }

      showToast('Cambios cargados correctamente.', 'success');
    } catch (error) {
      console.error('Error al cargar cambios:', error);
      showToast('No se pudieron cargar los cambios. Intentá nuevamente.', 'error');
    }
  };

  const isEditingWorkedEntry = editMode === ENTRY_TYPES.WORKED;
  const isEditingAbsence = editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE;

  return (
    <div className={styles.containerMain}>
      <div className={styles.titleWrapper}>
        <span className={styles.title}>Promedio {selectedMonthName}</span>
        <span className={styles.average}>{formatDurationPlain(averageMonthlyDuration)}</span>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.weeklySummaryTable}>
          <thead>
            <tr>
              <th>Día</th>
              <th>Ingreso</th>
              <th>Salida</th>
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
                  onClick={() => context.setSelectedDate(row.date)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{row.day} {row.date.getDate()}</td>

                  {row.justifiedAbsence ? (
                    <>
                      <td colSpan={2}>
                        {row.absenceLabel}
                      </td>
                      <td>—</td>
                    </>
                  ) : (
                    <>
                      <td>
                        {row.worked ? row.start : <span className={styles.mutedCell}>-</span>}
                      </td>
                      <td>
                        {row.worked ? row.end : <span className={styles.mutedCell}>-</span>}
                      </td>
                      <td>
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

                  <td className={styles.actionsColumn}>
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

            <tr className={styles.weeklySummarySubfooter}>
              <td colSpan={3}>
                Diferencia Mensual
              </td>
              <td colSpan={2}>
                <span className={getDiffBadgeClass(totalMonthlyDiff)}>
                  {formatDuration(totalMonthlyDiff)}
                </span>
              </td>
            </tr>

            {/* <tr className={styles.weeklySummarySecondaryRow}>
              <td colSpan={3}>Diferencia Semanal</td>
              <td colSpan={2}>{formatDuration(totalDiff)}</td>
            </tr> */}
          </tbody>
        </table>

      <div className={styles.buttonsContainer}>
        <button
          className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.buttonUpload} ${
            context.hasPendingEntriesChanges ? styles.dirty : ""
          }`}
          onClick={handleUploadEntries}
          disabled={
            context.isUploadingEntries ||
            !context.hasPendingEntriesChanges
          }
          title={
            context.hasPendingEntriesChanges
              ? "Hay cambios pendientes de cargar"
              : "No hay cambios pendientes"
          }
        >
          {context.isUploadingEntries ? "CARGANDO..." : "CARGAR CAMBIOS"}

          {context.hasPendingEntriesChanges && !context.isUploadingEntries && (
            <span className={styles.dirtyDot} aria-hidden="true">
              <motion.span
                className={styles.dirtyDotRipple}
                initial={{ scale: 1, opacity: 0 }}
                animate={{
                  scale: [1, 1.8, 2.6],
                  opacity: [0, 0.45, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  times: [0, 0.15, 1],
                }}
              />
            </span>
          )}
        </button>
      </div>

        <ModalEditar isOpen={modalOpen} onClose={handleCancelEdit}>
          <div className={`${modalStyles.timeEntryContainer} ${modalStyles.modalSurface}`}>
            <div className={modalStyles.modalTitle}>
              {isEditingAbsence ? 'EDITAR AUSENCIA' : 'EDITAR HORARIO'}
            </div>

            {isEditingWorkedEntry && (
              <div className={modalStyles.timeEntryInputs}>
                <div className={modalStyles.timeEntryInputGroup}>
                  <label className={modalStyles.timeEntryLabel}>ENTRADA</label>
                  <input
                    type="time"
                    value={editStart}
                    onChange={e => setEditStart(e.target.value)}
                  />
                </div>

                <div className={modalStyles.timeEntryInputGroup}>
                  <label className={modalStyles.timeEntryLabel}>SALIDA</label>
                  <input
                    type="time"
                    value={editEnd}
                    onChange={e => setEditEnd(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isEditingAbsence && (
              <div className={modalStyles.absenceForm}>
                <div className={modalStyles.absenceField}>
                  <label>Motivo</label>

                  <select
                    value={editAbsenceReason}
                    onChange={(event) => setEditAbsenceReason(event.target.value)}
                  >
                    {Object.values(ABSENCE_REASONS).map((reason) => (
                      <option key={reason} value={reason}>
                        {ABSENCE_REASON_LABELS[reason]}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            )}

            <div className={modalStyles.modalButtonsContainer}>
              <div className={modalStyles.modalDeleteCancelButtons}>
                <button onClick={handleDeleteEdit} className={`${buttonStyles.button} ${buttonStyles.danger} ${modalStyles.button}`}>
                  ELIMINAR
                </button>

                <button onClick={handleCancelEdit} className={`${buttonStyles.button} ${buttonStyles.secondary} ${modalStyles.button}`}>
                  CANCELAR
                </button>
              </div>

              <div className={modalStyles.modalSaveButton}>
                <button className={`${buttonStyles.button} ${buttonStyles.primary} ${modalStyles.button}`} onClick={handleSaveEdit}>
                  GUARDAR
                </button>
              </div>
            </div>
          </div>
        </ModalEditar>
        <ConfirmModal
          isOpen={confirmDeleteOpen}
          title={
            editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE
              ? 'Eliminar ausencia'
              : 'Eliminar entrada'
          }
          message={
            editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE
              ? '¿Estás seguro de que querés borrar esta ausencia? El cambio quedará pendiente hasta que cargues los cambios.'
              : '¿Estás seguro de que querés borrar esta entrada? El cambio quedará pendiente hasta que cargues los cambios.'
          }
          confirmText="Eliminar"
          cancelText="Cancelar"
          danger
          onConfirm={handleConfirmDeleteEdit}
          onCancel={handleCancelDeleteEdit}
        />
      </div>
    </div>
  );
};

export default ResumenSemana;
