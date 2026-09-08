import React, { useContext, useMemo, useState } from 'react';
import Context from '@/context';
import ConfirmModal from '@/componentes/ConfirmModal';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
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
import {
  formatMinutes as formatWorkedMinutes,
  editBreakTime,
  getBreakMinutes,
  getWorkedMinutes,
  normalizeBreaks,
  validateWorkedEntry,
} from '@/utils/entries/timeCalculations';
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

const ResumenSemana = () => {
  const context = useContext(Context);
  const { showToast } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editDate, setEditDate] = useState(null);
  const [editMode, setEditMode] = useState(null);

  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editBreaks, setEditBreaks] = useState([]);

  const [editAbsenceReason, setEditAbsenceReason] = useState(ABSENCE_REASONS.VACATION);
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

  const resetEditState = () => {
    setModalOpen(false);
    setEditDate(null);
    setEditMode(null);
    setEditStart('');
    setEditEnd('');
    setEditBreaks([]);
    setEditAbsenceReason(ABSENCE_REASONS.VACATION);
  };

  const handleEditClick = (row) => {
    setEditDate(row.dateStr);

    if (row.justifiedAbsence) {
      setEditMode(ENTRY_TYPES.JUSTIFIED_ABSENCE);
      setEditAbsenceReason(row.entry.absenceReason || ABSENCE_REASONS.VACATION);
      setEditStart('');
      setEditEnd('');
      setEditBreaks([]);
    } else {
      setEditMode(ENTRY_TYPES.WORKED);
      setEditStart(row.start);
      setEditEnd(row.end);
      setEditBreaks(normalizeBreaks(row.entry.breaks));
      setEditAbsenceReason(ABSENCE_REASONS.VACATION);
    }

    setModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editDate) return;

    const filteredEntries = context.entries.filter(e => e.date !== editDate);

    if (editMode === ENTRY_TYPES.WORKED) {
      if (!editStart) {
        showToast('Completá la hora de entrada.', 'warning');
        return;
      }

    const editedEntry = buildWorkedEntry({
        date: editDate,
        start: editStart,
        end: editEnd,
        clockStatus: editEnd ? 'closed' : 'open',
        breaks: editBreaks,
        startTimestamp: (() => {
          const original = context.entries.find((entry) => entry.date === editDate);
          return original?.start === editStart ? original.startTimestamp : undefined;
        })(),
      });

      const validation = validateWorkedEntry(editedEntry, {
        allowOpenEntry: !editEnd,
        allowOpenBreak: !editEnd,
      });
      if (!validation.valid) {
        showToast(validation.error, 'warning');
        return;
      }

      filteredEntries.push(editedEntry);
    }

    if (editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE) {
    filteredEntries.push(
      buildJustifiedAbsenceEntry({
        date: editDate,
        absenceReason: editAbsenceReason,
      })
    );
    }

    const savedEntry = filteredEntries.find((entry) => entry.date === editDate);
    if (!savedEntry || savingEdit) return;
    try {
      setSavingEdit(true);
      const persisted = await context.persistEntry(savedEntry);
      if (!persisted) {
        showToast('No se pudo guardar la edición. Revisá la conexión e intentá nuevamente.', 'error');
        return;
      }
      resetEditState();
    } catch (saveError) {
      console.error('Error guardando edición:', saveError);
      showToast('No se pudo guardar la edición. Revisá la conexión e intentá nuevamente.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEdit = () => {
    if (!editDate) return;

    setConfirmDeleteOpen(true);
  };
  const handleConfirmDeleteEdit = async () => {
    if (!editDate || savingEdit) return;

    let removed = false;
    try {
      setSavingEdit(true);
      removed = await context.removeEntry(editDate);
    } catch (deleteError) {
      console.error('Error eliminando registro:', deleteError);
    } finally {
      setSavingEdit(false);
    }
    if (!removed) {
      setConfirmDeleteOpen(false);
      showToast('No se pudo eliminar el registro. Revisá la conexión e intentá nuevamente.', 'error');
      return;
    }

    showToast(
      editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE
        ? 'Ausencia eliminada.'
        : 'Entrada eliminada.',
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

  const isEditingWorkedEntry = editMode === ENTRY_TYPES.WORKED;
  const isEditingAbsence = editMode === ENTRY_TYPES.JUSTIFIED_ABSENCE;

  const updateEditBreak = (index, field, value) => {
    setEditBreaks((current) => current.map((workBreak, breakIndex) =>
      breakIndex === index
        ? editBreakTime(workBreak, field, value)
        : workBreak
    ));
  };

  return (
    <div className={styles.containerMain}>
      <div className={styles.titleWrapper}>
        <span className={styles.title}>Promedio {selectedMonthName}</span>
        <span className={styles.average}>{formatDurationPlain(averageMonthlyDuration)}</span>
        <span className={styles.syncStatus} role={context.syncStatus === 'error' ? 'alert' : undefined}>
          {context.syncStatus === 'syncing' && 'Sincronizando…'}
          {context.syncStatus === 'offline' && 'Sin conexión\nCambios en\nespera'}
          {context.syncStatus === 'error' && 'Error de sincronización'}
          {context.syncStatus === 'migration' && (
            context.legacyUnassignedCount > 0
              ? 'Cambios anteriores sin asociar'
              : 'Cambios anteriores por importar'
          )}
          {context.syncStatus === 'synced' && 'Sincronizado'}
        </span>
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
                  onClick={() => context.setSelectedDate(row.date)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{row.day} {row.date.getDate()}</td>

                  {row.justifiedAbsence ? (
                    <>
                      <td colSpan={3}>
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
                        {row.worked ? formatWorkedMinutes(row.breakMinutes) : <span className={styles.mutedCell}>-</span>}
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
              <td colSpan={4}>
                Diferencia Mensual
              </td>
              <td colSpan={2}>
                <span className={getDiffBadgeClass(totalMonthlyDiff)}>
                  {formatDuration(totalMonthlyDiff)}
                </span>
              </td>
            </tr>

          </tbody>
        </table>

        <ModalEditar isOpen={modalOpen} onClose={handleCancelEdit}>
          <div className={`${modalStyles.timeEntryContainer} ${modalStyles.modalSurface}`}>
            <div className={modalStyles.modalTitle}>
              {isEditingAbsence ? 'EDITAR AUSENCIA' : 'EDITAR HORARIO'}
            </div>

            {isEditingWorkedEntry && (
              <div className={styles.editWorkedContent}>
              <div className={modalStyles.timeEntryInputs}>
                <div className={modalStyles.timeEntryInputGroup}>
                  <label className={modalStyles.timeEntryLabel}>ENTRADA</label>
                  <input
                    type="time"
                    value={editStart}
                    onChange={e => setEditStart(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.removeBreakButton}
                    aria-label="Borrar hora de entrada"
                    title="Borrar hora de entrada"
                    disabled={!editStart}
                    onClick={() => setEditStart('')}
                  >
                    ×
                  </button>
                </div>

                <div className={modalStyles.timeEntryInputGroup}>
                  <label className={modalStyles.timeEntryLabel}>SALIDA</label>
                  <input
                    type="time"
                    value={editEnd}
                    onChange={e => setEditEnd(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.removeBreakButton}
                    aria-label="Borrar hora de salida"
                    title="Borrar hora de salida"
                    disabled={!editEnd}
                    onClick={() => setEditEnd('')}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={styles.editBreaks}>
                <div className={styles.editBreaksHeader}>
                  <strong>Salidas transitorias</strong>
                  <button
                    type="button"
                    className={`${buttonStyles.button} ${buttonStyles.secondary}`}
                    onClick={() => setEditBreaks((current) => [...current, { start: '', end: '' }])}
                  >
                    AGREGAR
                  </button>
                </div>
                {editBreaks.length === 0 && <small>No hay salidas registradas.</small>}
                {editBreaks.map((workBreak, index) => (
                  <div className={styles.editBreakRow} key={index}>
                    <input
                      type="time"
                      aria-label={`Salida transitoria ${index + 1}`}
                      value={workBreak.start}
                      onChange={(event) => updateEditBreak(index, 'start', event.target.value)}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      aria-label={`Reingreso ${index + 1}`}
                      value={workBreak.end}
                      onChange={(event) => updateEditBreak(index, 'end', event.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.removeBreakButton}
                      aria-label={`Eliminar salida transitoria ${index + 1}`}
                      onClick={() => setEditBreaks((current) => current.filter((_, breakIndex) => breakIndex !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
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
                <button onClick={handleDeleteEdit} disabled={savingEdit} className={`${buttonStyles.button} ${buttonStyles.danger} ${modalStyles.button}`}>
                  ELIMINAR
                </button>

                <button onClick={handleCancelEdit} disabled={savingEdit} className={`${buttonStyles.button} ${buttonStyles.secondary} ${modalStyles.button}`}>
                  CANCELAR
                </button>
              </div>

              <div className={modalStyles.modalSaveButton}>
                <button className={`${buttonStyles.button} ${buttonStyles.primary} ${modalStyles.button}`} onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? 'GUARDANDO…' : 'GUARDAR'}
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
              ? '¿Estás seguro de que querés borrar esta ausencia?'
              : '¿Estás seguro de que querés borrar esta entrada?'
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
