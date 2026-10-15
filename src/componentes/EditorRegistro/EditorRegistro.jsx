import { FiTrash2, FiX } from 'react-icons/fi';
import React, { useContext, useLayoutEffect, useState } from 'react';
import Context from '@/context';
import ConfirmModal from '@/componentes/ConfirmModal';
import ModalEditar from '@/componentes/ModalEditar';
import { useToast } from '@/context/ToastContext';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
  ENTRY_TYPES,
  isJustifiedAbsenceEntry,
} from '@/utils/entries/entriesStatus';
import {
  buildJustifiedAbsenceEntry,
  buildWorkedEntry,
} from '@/utils/entries/buildEntries';
import {
  editBreakTime,
  normalizeBreaks,
  validateWorkedEntry,
} from '@/utils/entries/timeCalculations';
import buttonStyles from '@/styles/Botones.module.scss';
import modalStyles from '@/componentes/ModalEditar/ModalEditar.module.scss';
import styles from './EditorRegistro.module.scss';

// Editor único para una carga existente, utilizado desde Jornada y Resumen.
// Reutiliza las mismas validaciones y operaciones de persistencia del editor original.
const EditorRegistro = ({ isOpen, dateStr, entry, onClose }) => {
  const context = useContext(Context);
  const { showToast } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editBreaks, setEditBreaks] = useState([]);
  const [editAbsenceReason, setEditAbsenceReason] = useState(ABSENCE_REASONS.VACATION);

  // Inicializamos cada apertura antes del pintado, sin sobrescribir borradores
  // mientras el usuario edita y llegan actualizaciones desde Firebase.
  useLayoutEffect(() => {
    if (!isOpen || !entry) return;
    if (isJustifiedAbsenceEntry(entry)) {
      setEditMode(ENTRY_TYPES.JUSTIFIED_ABSENCE);
      setEditAbsenceReason(entry.absenceReason || ABSENCE_REASONS.VACATION);
      setEditStart('');
      setEditEnd('');
      setEditBreaks([]);
    } else {
      setEditMode(ENTRY_TYPES.WORKED);
      setEditStart(entry.start || '');
      setEditEnd(entry.end || '');
      setEditBreaks(normalizeBreaks(entry.breaks));
      setEditAbsenceReason(ABSENCE_REASONS.VACATION);
    }
    setConfirmDeleteOpen(false);
  }, [isOpen, dateStr]);

  const closeEditor = () => {
    setConfirmDeleteOpen(false);
    setEditMode(null);
    setEditStart('');
    setEditEnd('');
    setEditBreaks([]);
    setEditAbsenceReason(ABSENCE_REASONS.VACATION);
    onClose?.();
  };

  const handleSaveEdit = async () => {
    if (!dateStr) return;

    const filteredEntries = context.entries.filter(e => e.date !== dateStr);

    if (editMode === ENTRY_TYPES.WORKED) {
      if (!editStart) {
        showToast('Completá la hora de entrada.', 'warning');
        return;
      }

      const editedEntry = buildWorkedEntry({
        date: dateStr,
        start: editStart,
        end: editEnd,
        clockStatus: editEnd ? 'closed' : 'open',
        breaks: editBreaks,
        startTimestamp: (() => {
          const original = context.entries.find((entry) => entry.date === dateStr);
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
        date: dateStr,
        absenceReason: editAbsenceReason,
      })
    );
    }

    const savedEntry = filteredEntries.find((entry) => entry.date === dateStr);
    if (!savedEntry || savingEdit) return;
    try {
      setSavingEdit(true);
      const persisted = await context.persistEntry(savedEntry);
      if (!persisted) {
        showToast('No se pudo guardar la edición. Revisá la conexión e intentá nuevamente.', 'error');
        return;
      }
      closeEditor();
    } catch (saveError) {
      console.error('Error guardando edición:', saveError);
      showToast('No se pudo guardar la edición. Revisá la conexión e intentá nuevamente.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEdit = () => {
    if (!dateStr) return;

    setConfirmDeleteOpen(true);
  };
  const handleConfirmDeleteEdit = async () => {
    if (!dateStr || savingEdit) return;

    let removed = false;
    try {
      setSavingEdit(true);
      removed = await context.removeEntry(dateStr);
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
    closeEditor();
  };

  const handleCancelDeleteEdit = () => {
    setConfirmDeleteOpen(false);
  };

  const handleCancelEdit = () => {
    closeEditor();
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
    <>
        <ModalEditar isOpen={isOpen} onClose={handleCancelEdit}>
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
                    <FiX aria-hidden="true" />
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
                    <FiX aria-hidden="true" />
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
                      <FiX aria-hidden="true" />
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

            <div className={`${modalStyles.modalButtonsContainer} ${modalStyles.editorActions}`}>
              <div className={modalStyles.modalDeleteCancelButtons}>
                <button
                  type="button"
                  aria-label="Eliminar registro"
                  title="Eliminar registro"
                  onClick={handleDeleteEdit}
                  disabled={savingEdit}
                  className={`${buttonStyles.button} ${buttonStyles.danger} ${modalStyles.button} ${modalStyles.iconDeleteButton}`}
                >
                  <FiTrash2 aria-hidden="true" />
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
    </>
  );
};

export default EditorRegistro;
