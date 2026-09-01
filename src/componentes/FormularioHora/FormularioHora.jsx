import React, { useState, useEffect, useContext } from 'react';
import Context from '@/context';
import { format, isSameDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import ModalEditar from '@/componentes/ModalEditar';
import ConfirmModal from '@/componentes/ConfirmModal';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
  CLOCK_STATUS,
  getAbsenceReasonLabel,
  isJustifiedAbsenceEntry,
  isOpenWorkedEntry,
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
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import {
  formatMinutes,
  editBreakTime,
  getBreakMinutes,
  getElapsedMinutes,
  formatSeconds,
  getLiveTimeSummary,
  getOpenBreak,
  getWorkedMinutes,
  normalizeBreaks,
  validateWorkedEntry,
} from '@/utils/entries/timeCalculations';

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
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [draftBreaks, setDraftBreaks] = useState([]);
  const [breakToDelete, setBreakToDelete] = useState(null);

  useEffect(() => {
    if (!context.selectedDate) {
      setEntryExists(false);
      setSelectedEntry(null);
      setStartTime('');
      setEndTime('');
      setShowValidation(false);
      return;
    }

    const selectedDateStr = format(
      context.selectedDate,
      'yyyy-MM-dd'
    );

    const entry =
      context.entries.find(
        item => item.date === selectedDateStr
      ) || null;

    setSelectedEntry(entry);

    setEntryExists(
      isResolvedEntry(entry) &&
      !isOpenWorkedEntry(entry)
    );
    setShowValidation(false);

    if (
      entry &&
      !isJustifiedAbsenceEntry(entry)
    ) {
      setStartTime(entry.start || '');
      setEndTime(entry.end || '');
      setDraftBreaks(normalizeBreaks(entry.breaks));
      return;
    }

    setStartTime(defaultPersonalStartTime);
    setEndTime(defaultPersonalEndTime);
    setDraftBreaks([]);
  }, [context.entries, context.selectedDate, defaultPersonalStartTime, defaultPersonalEndTime]);

  const selectedDateStr = context.selectedDate
    ? format(context.selectedDate, 'yyyy-MM-dd')
    : '';

  const selectedDateIsToday =
    Boolean(context.selectedDate) &&
    isSameDay(
      context.selectedDate,
      new Date()
    );

  const selectedEntryIsOpen = isOpenWorkedEntry(selectedEntry);
  const persistedBreaks = normalizeBreaks(selectedEntry?.breaks);
  const selectedBreaks = selectedEntryIsOpen
    ? draftBreaks
    : persistedBreaks;
  const hasPendingBreakChanges = selectedEntryIsOpen &&
    JSON.stringify(draftBreaks) !== JSON.stringify(persistedBreaks);
  const selectedOpenBreak = getOpenBreak(selectedEntry);

  useEffect(() => {
    if (!selectedEntryIsOpen) return undefined;
    setCurrentTime(new Date());
    const timerId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, [selectedEntryIsOpen]);

  const liveTimeSummary = selectedEntryIsOpen
    ? getLiveTimeSummary(selectedEntry, currentTime)
    : { workedSeconds: 0, currentBreakSeconds: 0 };
  
  const getCurrentTime = () => format(new Date(), 'HH:mm');

  const handleClockIn = () => {
    if (
      !selectedDateStr ||
      !selectedDateIsToday ||
      selectedEntryIsOpen
    ) {
      return;
    }

    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    const openEntry = buildWorkedEntry({
      date: selectedDateStr,
      start: currentTime,
      end: '',
      clockStatus: CLOCK_STATUS.OPEN,
      startTimestamp: now.toISOString(),
    });

    context.persistEntry(openEntry);

    setStartTime(currentTime);
    setEndTime('');
    setShowValidation(false);
  };

  const handleClockOut = () => {
    if (
      !selectedDateStr ||
      !selectedDateIsToday ||
      !selectedEntryIsOpen ||
      !startTime ||
      selectedOpenBreak
    ) {
      return;
    }

    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    const completedEntry = buildWorkedEntry({
      date: selectedDateStr,
      start: startTime,
      end: currentTime,
      clockStatus: CLOCK_STATUS.CLOSED,
      breaks: selectedBreaks,
      startTimestamp: startTime === selectedEntry?.start
        ? selectedEntry?.startTimestamp
        : undefined,
      endTimestamp: now.toISOString(),
    });

    const validation = validateWorkedEntry(completedEntry);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    context.persistEntry(completedEntry);

    setEndTime(currentTime);
    setShowValidation(false);
  };

  const handleTemporaryExit = () => {
    if (!selectedDateIsToday || !selectedEntryIsOpen || selectedOpenBreak) return;

    const now = new Date();

    const updatedEntry = buildWorkedEntry({
      ...selectedEntry,
      date: selectedDateStr,
      start: startTime,
      end: '',
      clockStatus: CLOCK_STATUS.OPEN,
      breaks: [...selectedBreaks, {
        start: format(now, 'HH:mm'),
        end: '',
        startTimestamp: now.toISOString(),
      }],
    });

    context.persistEntry(updatedEntry);
  };

  const handleReturn = () => {
    if (!selectedDateIsToday || !selectedEntryIsOpen || !selectedOpenBreak) return;

    const now = new Date();

    const updatedBreaks = selectedBreaks.map((workBreak) =>
      workBreak.start && !workBreak.end
        ? {
            ...workBreak,
            end: format(now, 'HH:mm'),
            endTimestamp: now.toISOString(),
          }
        : workBreak
    );

    const updatedEntry = buildWorkedEntry({
      ...selectedEntry,
      date: selectedDateStr,
      start: startTime,
      end: '',
      clockStatus: CLOCK_STATUS.OPEN,
      breaks: updatedBreaks,
    });

    context.persistEntry(updatedEntry);
  };

  const updateSelectedBreaks = (updatedBreaks) => {
    if (!selectedEntryIsOpen) return;

    const updatedEntry = buildWorkedEntry({
      ...selectedEntry,
      date: selectedDateStr,
      start: startTime,
      end: '',
      clockStatus: CLOCK_STATUS.OPEN,
      breaks: updatedBreaks,
    });

    context.persistEntry(updatedEntry);
  };

  const handleBreakChange = (index, field, value) => {
    setDraftBreaks(selectedBreaks.map((workBreak, breakIndex) =>
      breakIndex === index
        ? editBreakTime(workBreak, field, value)
        : workBreak
    ));
  };

  const handleDeleteBreak = (index) => {
    setDraftBreaks(
      selectedBreaks.filter((_, breakIndex) => breakIndex !== index)
    );
    setBreakToDelete(null);
  };

  const handleSaveBreaks = () => {
    const draftEntry = buildWorkedEntry({
      ...selectedEntry,
      date: selectedDateStr,
      start: startTime,
      end: '',
      clockStatus: CLOCK_STATUS.OPEN,
      breaks: selectedBreaks,
    });
    const validation = validateWorkedEntry(draftEntry, {
      allowOpenEntry: true,
      allowOpenBreak: true,
    });
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    updateSelectedBreaks(selectedBreaks);
  };

  const handleCloseEntry = () => {
    if (
      !selectedDateStr ||
      !selectedEntryIsOpen ||
      !startTime ||
      !endTime
    ) {
      setShowValidation(true);

      alert(
        'Completá la hora de entrada y la hora de salida para cerrar la jornada.'
      );

      return;
    }

    const closedEntry = buildWorkedEntry({
      date: selectedDateStr,
      start: startTime,
      end: endTime,
      clockStatus: CLOCK_STATUS.CLOSED,
      breaks: selectedBreaks,
      startTimestamp: startTime === selectedEntry?.start
        ? selectedEntry?.startTimestamp
        : undefined,
    });

    const validation = validateWorkedEntry(closedEntry);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    context.persistEntry(closedEntry);

    setShowValidation(false);
  };

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
      if (selectedEntryIsOpen) {
        context.persistEntry(buildWorkedEntry({
          ...selectedEntry,
          date: selectedDateStr,
          start: startTime,
          end: '',
          clockStatus: CLOCK_STATUS.OPEN,
          breaks: selectedBreaks,
          startTimestamp: startTime === selectedEntry?.start
            ? selectedEntry?.startTimestamp
            : undefined,
        }));
        setShowValidation(false);
        return;
      }

      const [hour, minute] =
        startTime.split(':').map(Number);

      const startDate = new Date();

      startDate.setHours(hour, minute, 0, 0);
      startDate.setHours(
        startDate.getHours() + 8
      );

      const pad = n =>
        String(n).padStart(2, '0');

      const autoEnd =
        `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;

      setEndTime(autoEnd);

      alert(
        'SALIDA se completó automáticamente (+8h). Pulse GUARDAR nuevamente para confirmar.'
      );

      return;
    }

    setShowValidation(false);

    const newEntry = buildWorkedEntry({
      date: selectedDateStr,
      start: startTime,
      end: endTime,
      clockStatus: CLOCK_STATUS.CLOSED,
      breaks: selectedBreaks,
      startTimestamp: startTime === selectedEntry?.start
        ? selectedEntry?.startTimestamp
        : undefined,
    });

    const validation = validateWorkedEntry(newEntry);
    if (!validation.valid) {
      setShowValidation(true);
      alert(validation.error);
      return;
    }

    context.persistEntry(newEntry);

    if (!selectedDateIsToday) {
      setStartTime('');
      setEndTime('');
    }
  };

  const handleStartTimeChange = (event) => {
    const newStartTime = event.target.value;

    setStartTime(newStartTime);
    setShowValidation(false);

    if (!selectedEntryIsOpen) {
      return;
    }

    // La edición permanece como borrador hasta que el usuario confirma Guardar.
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

    context.persistEntry(newEntry);

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
        month={context.selectedDate}
        onSelect={context.setSelectedDate}
        onMonthChange={context.setSelectedDate}
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
              <div className={styles.firstRow}>
                <span className={styles.entryStatusLabel}>Día cargado</span>
                <strong className={styles.entryStatusValue}>
                  {selectedEntry.start} a {selectedEntry.end}
                </strong>
              </div>
              {selectedBreaks.length > 0 && (
                <div className={styles.secondRow}>
                  <span className={styles.entryStatusDetail}>
                    {formatMinutes(getWorkedMinutes(selectedEntry))} trabajadas
                    {' · '}
                    {formatMinutes(getBreakMinutes(selectedEntry))} fuera
                    {' · '}
                    {formatMinutes(getElapsedMinutes(selectedEntry))} total
                  </span>
                </div>
              )}
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
        <div
          className={`
            ${styles.timeEntryContainer}
            ${styles.timeEntryContainerForm}
          `}
        >
          {selectedEntryIsOpen && (
            <div className={styles.openEntryStatus}>
              <span className={styles.openEntryStatusLabel}>
                Jornada en curso
              </span>

              <strong className={styles.openEntryStatusValue}>
                {selectedOpenBreak
                  ? `Fuera desde las ${selectedOpenBreak.start}`
                  : `Ingreso marcado a las ${startTime}`}
              </strong>
              <div className={styles.liveWorkedTime}>
                <span>Tiempo trabajado</span>
                <strong>{formatSeconds(liveTimeSummary.workedSeconds)}</strong>
              </div>
              {selectedOpenBreak && (
                <div className={styles.liveBreakTime}>
                  <span>Tiempo fuera actual</span>
                  <strong>{formatSeconds(liveTimeSummary.currentBreakSeconds)}</strong>
                </div>
              )}
            </div>
          )}

          {selectedEntryIsOpen && selectedDateIsToday && (
            <div className={styles.transientActionPanel}>
              <span className={styles.transientActionLabel}>Movimiento transitorio</span>
          {!selectedOpenBreak && (
            <button
              type="button"
              className={[
              buttonStyles.button,
              buttonStyles.primary,
              styles.clockActionButton,
              styles.temporaryExitButton,
            ].join(' ')}
              onClick={handleTemporaryExit}
            >
              MARCAR SALIDA TRANSITORIA
            </button>
          )}

          {selectedOpenBreak && (
            <button
              type="button"
              className={[
              buttonStyles.button,
              buttonStyles.primary,
              styles.clockActionButton,
              styles.temporaryExitButton,
              styles.returnButton
            ].join(' ')}
              onClick={handleReturn}
            >
              MARCAR REINGRESO
            </button>
          )}
            </div>
          )}

          {selectedEntryIsOpen && (selectedBreaks.length > 0 || persistedBreaks.length > 0) && (
            <div className={styles.breakSummary}>
              <strong>Salidas transitorias</strong>
              {selectedBreaks.length === 0 && (
                <small>La salida fue quitada. Aplicá los cambios para confirmarlo.</small>
              )}
              {selectedBreaks.map((workBreak, index) => (
                <div className={styles.breakEditRow} key={index}>
                  <input
                    type="time"
                    aria-label={`Salida transitoria ${index + 1}`}
                    value={workBreak.start}
                    onChange={(event) => handleBreakChange(index, 'start', event.target.value)}
                  />
                  <span>–</span>
                  <input
                    type="time"
                    aria-label={`Reingreso ${index + 1}`}
                    value={workBreak.end}
                    onChange={(event) => handleBreakChange(index, 'end', event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.deleteBreakButton}
                    aria-label={`Eliminar salida transitoria ${index + 1}`}
                    onClick={() => setBreakToDelete(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <small>
                Tiempo fuera: {formatMinutes(getBreakMinutes(selectedEntry, {
                  includeOpenUntil: selectedOpenBreak ? getCurrentTime() : null,
                }))}
              </small>
              <button
                type="button"
                className={`${buttonStyles.button} ${buttonStyles.secondary}`}
                onClick={handleSaveBreaks}
                disabled={!hasPendingBreakChanges}
              >
                {hasPendingBreakChanges
                  ? 'APLICAR CAMBIOS EN SALIDAS'
                  : 'SALIDAS SIN CAMBIOS'}
              </button>
            </div>
          )}

          <div className={styles.timeEntryInputs}>
            <div className={styles.timeEntryInputGroup}>
              <label>ENTRADA</label>

              <input
                type="time"
                value={startTime}
                onChange={handleStartTimeChange}
                className={
                  showValidation && !startTime
                    ? styles.inputError
                    : ''
                }
              />
            </div>

            <div className={styles.timeEntryInputGroup}>
              <label>SALIDA</label>

              <input
                type="time"
                value={endTime}
                onChange={(event) => {
                  setEndTime(event.target.value);
                  setShowValidation(false);
                }}
                className={
                  showValidation && !endTime
                    ? styles.inputError
                    : ''
                }
              />
            </div>
          </div>

          <div className={styles.editButtonsContainer}>
            <button
              type="button"
              className={`
                ${buttonStyles.button}
                ${buttonStyles.primary}
              `}
              onClick={handleSave}
            >
              GUARDAR HORARIO
            </button>

            <button
              type="button"
              className={`
                ${buttonStyles.button}
                ${buttonStyles.secondary}
              `}
              onClick={handleOpenAbsenceModal}
            >
              MARCAR AUSENCIA
            </button>
          </div>

          {!selectedDateIsToday && (
            <div className={styles.clockHelpText}>
              El fichaje automático solamente está disponible para hoy.
            </div>
          )}

          <hr className={styles.separator} />

          <div className={styles.clockButtonsContainer}>
            {selectedDateIsToday && (
              <>
                <button
                  type="button"
                  className={[
                    buttonStyles.button,
                    buttonStyles.primary,
                    styles.clockActionButton,
                    styles.clockInButton,
                  ].join(' ')}
                  onClick={handleClockIn}
                  disabled={
                    selectedEntryIsOpen ||
                    Boolean(selectedEntry)
                  }
                >
                  <span className={styles.clockActionIcon}>
                    <FiLogIn aria-hidden="true" />
                  </span>

                  <span className={styles.clockActionContent}>
                    <strong>MARCAR INGRESO</strong>
                    {/* <small>Guarda la hora actual</small> */}
                  </span>
                </button>

                <button
                  type="button"
                  className={[
                    buttonStyles.button,
                    buttonStyles.primary,
                    styles.clockActionButton,
                    styles.clockOutButton,
                  ].join(' ')}
                  onClick={handleClockOut}
                  disabled={!selectedEntryIsOpen || Boolean(selectedOpenBreak)}
                >
                  <span className={styles.clockActionIcon}>
                    <FiLogOut aria-hidden="true" />
                  </span>

                  <span className={styles.clockActionContent}>
                    <strong>FINALIZAR JORNADA</strong>
                    {/* <small>Guarda la hora actual</small> */}
                  </span>
                </button>
              </>
            )}

            {selectedEntryIsOpen && (
              <button
                type="button"
                className={`
                  ${buttonStyles.button}
                  ${buttonStyles.tertiary}
                  ${styles.closeWorkDayButton}
                `}
                onClick={handleCloseEntry}
                disabled={!startTime || !endTime}
              >
                CERRAR JORNADA
              </button>
            )}
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
      <ConfirmModal
        isOpen={breakToDelete !== null}
        title="Eliminar salida transitoria"
        message="¿Querés eliminar esta salida transitoria? El cambio quedará pendiente hasta que pulses Aplicar cambios en salidas."
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
        onConfirm={() => handleDeleteBreak(breakToDelete)}
        onCancel={() => setBreakToDelete(null)}
      />
    </div>
  );
};

export default FormularioHora;
