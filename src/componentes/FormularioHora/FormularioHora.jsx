import React, { useState, useEffect, useContext } from 'react';
import Context from '@/context';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import ModalEditar from '@/componentes/ModalEditar';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
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
import styles from './FormularioHora.module.scss';

const FormularioHora = () => {
  const context = useContext(Context);

  const { defaultPersonalStartTime, defaultPersonalEndTime } = context.defaultWorkTime;

  const [startTime, setStartTime] = useState(defaultPersonalStartTime);
  const [endTime, setEndTime] = useState(defaultPersonalEndTime);

  const [entryExists, setEntryExists] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [showValidation, setShowValidation] = useState(false);

  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceReason, setAbsenceReason] = useState(ABSENCE_REASONS.VACATION);

  useEffect(() => {
    if (!context.selectedDate) {
      setEntryExists(false);
      setSelectedEntry(null);
      return;
    }

    const selectedDateStr = format(context.selectedDate, 'yyyy-MM-dd');
    const entry = context.entries.find(item => item.date === selectedDateStr) || null;

    setSelectedEntry(entry);
    setEntryExists(isResolvedEntry(entry));
  }, [context.entries, context.selectedDate]);

  const selectedDateStr = context.selectedDate
    ? format(context.selectedDate, 'yyyy-MM-dd')
    : '';

  const handleSave = () => {
    if (!selectedDateStr) return;

    if (!startTime && endTime) {
      setShowValidation(true);
      alert('Debe ingresar una hora válida tanto para ENTRADA como para SALIDA.');
      return;
    }

    if (!startTime && !endTime) {
      setShowValidation(true);
      alert('Debe ingresar una hora válida tanto para ENTRADA como para SALIDA.');
      return;
    }

    if (startTime && !endTime) {
      const [hour, minute] = startTime.split(':').map(Number);
      const startDate = new Date();

      startDate.setHours(hour, minute, 0, 0);
      startDate.setHours(startDate.getHours() + 8);

      const pad = (n) => String(n).padStart(2, '0');
      const autoEnd = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;

      setEndTime(autoEnd);
      alert('SALIDA se completó automáticamente (+8h). Pulse GUARDAR nuevamente para confirmar.');
      return;
    }

    setShowValidation(false);

    const newEntry = buildWorkedEntry({
      date: selectedDateStr,
      start: startTime,
      end: endTime,
    });

    context.setEntries(prev => [
      ...prev.filter(e => e.date !== newEntry.date),
      newEntry,
    ]);

    setStartTime('');
    setEndTime('');
  };

  const handleOpenAbsenceModal = () => {
    setAbsenceReason(ABSENCE_REASONS.VACATION);
    setAbsenceModalOpen(true);
  };

  const handleSaveAbsence = () => {
    if (!selectedDateStr) return;

  const newEntry = buildJustifiedAbsenceEntry({
    date: selectedDateStr,
    absenceReason,
  });

    context.setEntries(prev => [
      ...prev.filter(e => e.date !== newEntry.date),
      newEntry,
    ]);

    setAbsenceModalOpen(false);
    setAbsenceReason(ABSENCE_REASONS.VACATION);
    setStartTime('');
    setEndTime('');
  };

  const handleCancelAbsence = () => {
    setAbsenceModalOpen(false);
    setAbsenceReason(ABSENCE_REASONS.VACATION);
  };

  const customEs = {
    ...es,
    localize: {
      ...es.localize,
      month: (n, opts) => {
        const original = es.localize.month(n, opts);
        return original.charAt(0).toUpperCase() + original.slice(1);
      },
    },
  };

  const selectedEntryIsAbsence = isJustifiedAbsenceEntry(selectedEntry);
  const selectedEntryIsWorked = isWorkedEntry(selectedEntry);
  const justifiedAbsenceDates = context.entries
  .filter(isJustifiedAbsenceEntry)
  .map((entry) => new Date(`${entry.date}T00:00:00`));

  return (
    <div className={`${styles.containerMain} ${styles.calendar}`}>
      <DayPicker
        locale={customEs}
        animate
        mode="single"
        selected={context.selectedDate}
        onSelect={context.setSelectedDate}
        weekStartsOn={1}
        showOutsideDays
        required
        disabled={[
          { dayOfWeek: [0, 6] },
        ]}
        modifiers={{
          justifiedAbsence: justifiedAbsenceDates,
        }}
        modifiersClassNames={{
          justifiedAbsence: styles.justifiedAbsenceDay,
        }}
      />

      {entryExists && (
        <div className={`${styles.timeEntryContainer} ${styles.timeEntryContainerLoaded}`}>
          {selectedEntryIsWorked && (
            <div className={styles.entryStatusCard}>
              <span className={styles.entryStatusLabel}>Día cargado</span>
              <strong className={styles.entryStatusValue}>
                {selectedEntry.start} a {selectedEntry.end}
              </strong>
            </div>
          )}

          {selectedEntryIsAbsence && (
            <div className={styles.entryStatusCard}>
              <span className={styles.entryStatusLabel}>Ausencia justificada</span>
              <strong className={styles.entryStatusValue}>
                {getAbsenceReasonLabel(selectedEntry.absenceReason)}
              </strong>
            </div>
          )}
        </div>
      )}

      {!entryExists && (
        <div className={`${styles.timeEntryContainer} ${styles.timeEntryContainerForm}`}>
          <div className={styles.timeEntryInputs}>
            <div className={styles.timeEntryInputGroup}>
              <label>ENTRADA</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={showValidation && !startTime ? styles.inputError : ''}
              />
            </div>

            <div className={styles.timeEntryInputGroup}>
              <label>SALIDA</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={showValidation && !endTime ? styles.inputError : ''}
              />
            </div>
          </div>

          <div className={styles.editButtonsContainer}>
            <button className={`${buttonStyles.button} ${buttonStyles.primary}`} onClick={handleSave}>
              GUARDAR HORARIO
            </button>

            <button className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={handleOpenAbsenceModal}>
              MARCAR AUSENCIA
            </button>
          </div>
        </div>
      )}

      <ModalEditar isOpen={absenceModalOpen} onClose={handleCancelAbsence}>
        <div className={`${styles.timeEntryContainer} ${styles.timeEntryContainerModal} ${modalStyles.timeEntryContainer} ${modalStyles.modalSurface}`}>
          <div className={modalStyles.modalTitle}>MARCAR AUSENCIA</div>

          <div className={`${styles.absenceForm} ${modalStyles.absenceForm}`}>
            <div className={`${styles.absenceField} ${modalStyles.absenceField}`}>
              <label>Motivo</label>

              <select
                value={absenceReason}
                onChange={(event) => setAbsenceReason(event.target.value)}
              >
                {Object.values(ABSENCE_REASONS).map((reason) => (
                  <option key={reason} value={reason}>
                    {ABSENCE_REASON_LABELS[reason]}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className={modalStyles.modalButtonsContainer}>
            <div className={modalStyles.modalDeleteCancelButtons}>
              <button className={`${buttonStyles.button} ${buttonStyles.secondary} ${modalStyles.button}`} onClick={handleCancelAbsence}>
                CANCELAR
              </button>

              <button className={`${buttonStyles.button} ${buttonStyles.primary} ${modalStyles.button}`} onClick={handleSaveAbsence}>
                GUARDAR
              </button>
            </div>
          </div>
        </div>
      </ModalEditar>
    </div>
  );
};

export default FormularioHora;
