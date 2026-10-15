import React, { useState, useEffect, useContext } from 'react';
import Context from '@/context';
import { format, isSameDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import ModalEditar from '@/componentes/ModalEditar';
import ConfirmModal from '@/componentes/ConfirmModal';
import EditorRegistro from '@/componentes/EditorRegistro';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
  CLOCK_STATUS,
  canMarkAbsenceOnDate,
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
import { FiEdit, FiLogIn, FiLogOut, FiArrowUpRight, FiCornerDownLeft, FiChevronRight, FiChevronDown, FiX } from 'react-icons/fi';
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

const FormularioHora = ({ onOpenCalendar, onDateSelected }) => {
  const context = useContext(Context);

  // const { defaultPersonalStartTime, defaultPersonalEndTime } = context.defaultWorkTime;

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [entryExists, setEntryExists] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [showValidation, setShowValidation] = useState(false);

  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [absenceReason, setAbsenceReason] = useState(ABSENCE_REASONS.VACATION);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [draftBreaks, setDraftBreaks] = useState([]);
  const [breakToDelete, setBreakToDelete] = useState(null);
  const [manualCorrectionsOpen, setManualCorrectionsOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

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

    setStartTime('');
    setEndTime('');
    setDraftBreaks([]);
  }, [context.entries, context.selectedDate]);

  const selectedDateStr = context.selectedDate
    ? format(context.selectedDate, 'yyyy-MM-dd')
    : '';

  const canMarkAbsence = canMarkAbsenceOnDate(context.entries, selectedDateStr);

  const selectedDateIsToday =
    Boolean(context.selectedDate) &&
    isSameDay(
      context.selectedDate,
      new Date()
    );

  // Abrimos la carga manual al explorar fechas pasadas; para hoy priorizamos el fichaje.
  // El panel solo se oculta visualmente: los valores siguen en FormularioHora.
  useEffect(() => {
    setManualCorrectionsOpen(!selectedDateIsToday);
  }, [selectedDateStr, selectedDateIsToday]);

  const selectedEntryIsOpen = isOpenWorkedEntry(selectedEntry);
  const persistedBreaks = normalizeBreaks(selectedEntry?.breaks);
  const selectedBreaks = selectedEntryIsOpen
    ? draftBreaks
    : persistedBreaks;
  const hasPendingBreakChanges = selectedEntryIsOpen &&
    JSON.stringify(draftBreaks) !== JSON.stringify(persistedBreaks);
  const selectedOpenBreak = getOpenBreak(selectedEntry);
  // Estos indicadores son exclusivamente visuales: no alteran el guardado.
  const hasPendingTimeChanges = !entryExists && (
    startTime !== (selectedEntry?.start || '') ||
    endTime !== (selectedEntry?.end || '')
  );


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
      const openEntry = buildWorkedEntry({
        ...selectedEntry,
        date: selectedDateStr,
        start: startTime,
        end: '',
        clockStatus: CLOCK_STATUS.OPEN,
        breaks: selectedBreaks,
        startTimestamp: startTime === selectedEntry?.start
          ? selectedEntry?.startTimestamp
          : undefined,
      });
      const validation = validateWorkedEntry(openEntry, {
        allowOpenEntry: true,
        allowOpenBreak: true,
      });
      if (!validation.valid) {
        setShowValidation(true);
        alert(validation.error);
        return;
      }
      context.persistEntry(openEntry);
      setShowValidation(false);
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
    if (!canMarkAbsence) return;
    setAbsenceReason(ABSENCE_REASONS.VACATION);
    setAbsenceModalOpen(true);
  };

  const handleSaveAbsence = () => {
    if (!selectedDateStr) return;

    // Se vuelve a verificar al confirmar por si el registro llegó desde
    // Firestore mientras el modal estaba abierto.
    if (!canMarkAbsenceOnDate(context.entries, selectedDateStr)) {
      setAbsenceModalOpen(false);
      alert('Esta fecha ya tiene un registro. No se puede reemplazar por una ausencia desde esta opción.');
      return;
    }

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
  // Fechas de calendario: las categorías se derivan de los registros existentes.
  // No se almacenan ni se modifica su estado al representarlas.
  const calendarDates = context.entries.reduce((dates, entry) => {
    if (!entry?.date) return dates;
    if (isJustifiedAbsenceEntry(entry)) {
      dates.justifiedAbsence.push(new Date(`${entry.date}T00:00:00`));
    } else if (isOpenWorkedEntry(entry)) {
      dates.openWorked.push(new Date(`${entry.date}T00:00:00`));
    } else if (isWorkedEntry(entry)) {
      dates.closedWorked.push(new Date(`${entry.date}T00:00:00`));
    }
    return dates;
  }, { justifiedAbsence: [], openWorked: [], closedWorked: [] });

  const handleSelectToday = () => {
    context.setSelectedDate(new Date());
    onDateSelected?.();
  };

  return (
    <div className={styles.containerMain}>
      <section className={styles.calendarPane} data-pane="calendar" aria-label="Calendario de jornadas">
        <div className={`${styles.paneHeading} ${styles.calendarPaneHeading}`}>
          <div>
            <span className={styles.paneEyebrow}>Explorar fechas</span>
            <h2>Calendario</h2>
          </div>
          <button
            type="button"
            className={styles.todayButton}
            onClick={handleSelectToday}
            disabled={selectedDateIsToday}
            aria-label="Volver a la jornada de hoy"
          >
            Hoy
          </button>
        </div>
      <DayPicker
        locale={customEs}
        animate
        mode="single"
        selected={context.selectedDate}
        month={context.selectedDate}
        onSelect={(date) => {
          context.setSelectedDate(date);
          if (date) onDateSelected?.();
        }}
        onMonthChange={context.setSelectedDate}
        weekStartsOn={1}
        showOutsideDays
        required
        disabled={[
          { dayOfWeek: [0, 6] },
        ]}
        modifiers={{
          justifiedAbsence: calendarDates.justifiedAbsence,
          closedWorked: calendarDates.closedWorked,
          openWorked: calendarDates.openWorked,
        }}
        modifiersClassNames={{
          justifiedAbsence: styles.justifiedAbsenceDay,
          closedWorked: styles.closedWorkedDay,
          openWorked: styles.openWorkedDay,
        }}
      />
      <div className={styles.calendarLegend} aria-label="Referencias del calendario">
        <span><i className={styles.legendWorked} aria-hidden="true" />Trabajado</span>
        <span><i className={styles.legendAbsence} aria-hidden="true" />Ausencia</span>
        <span><i className={styles.legendOpen} aria-hidden="true" />Jornada abierta</span>
      </div>
      </section>

      <section className={styles.workPane} data-pane="work" aria-label="Registro de jornada">
        <div className={styles.workPaneHeading}>
          <div>
            <span className={styles.paneEyebrow}>Registro seleccionado</span>
            <h2>{context.selectedDate ? format(context.selectedDate, "EEEE d 'de' MMMM", { locale: es }) : 'Elegí una fecha'}</h2>
          </div>
          <button type="button" className={styles.changeDateButton} onClick={onOpenCalendar}>
            Cambiar día
          </button>
        </div>

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
              <div className={styles.secondRow}>
                <span className={styles.entryStatusDetail}>
                  {formatMinutes(getWorkedMinutes(selectedEntry))} trabajadas

                  {selectedBreaks.length > 0 && (
                    <>
                      {' · '}
                      {formatMinutes(getBreakMinutes(selectedEntry))} fuera
                      {' · '}
                      {formatMinutes(getElapsedMinutes(selectedEntry))} total
                    </>
                  )}
                </span>
              </div>
              {selectedBreaks.length > 0 && (
                <section className={styles.savedBreaks} aria-label="Detalle de salidas transitorias">
                  <div className={styles.savedBreaksHeading}>
                    <strong>Salidas transitorias</strong>
                    <span>{selectedBreaks.length} {selectedBreaks.length === 1 ? 'salida' : 'salidas'}</span>
                  </div>
                  <ol className={styles.savedBreaksList}>
                    {selectedBreaks.map((workBreak, index) => (
                      <li className={styles.savedBreakRow} key={index}>
                        <span className={styles.savedBreakLabel}>Salida {index + 1}</span>
                        <span className={styles.savedBreakHours}>
                          <time>{workBreak.start || '—'}</time>
                          <span aria-hidden="true">–</span>
                          <time>{workBreak.end || '—'}</time>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
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
          <button
            type="button"
            className={`${buttonStyles.button} ${buttonStyles.secondary} ${styles.editLoadedEntryButton}`}
            aria-label={`Editar registro del ${format(context.selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })}`}
            onClick={() => setEditingRecord({ dateStr: selectedDateStr, entry: selectedEntry })}
          >
            <FiEdit aria-hidden="true" />
            Editar registro
          </button>
        </div>
      )}

      {!entryExists && (
        <div className={`${styles.timeEntryContainer} ${styles.timeEntryContainerForm} ${styles.jornadaLayout}`}>
          {selectedEntryIsOpen ? (
            <section className={styles.jornadaStatus} aria-label="Estado de la jornada">
              <div className={styles.jornadaStatusHeading}>
                <span className={`${styles.jornadaStateBadge} ${selectedOpenBreak ? styles.jornadaStateAway : ''}`}>
                  <span className={styles.jornadaStateDot} aria-hidden="true" />
                  {selectedOpenBreak ? 'En salida transitoria' : 'Trabajando'}
                </span>
                <span className={styles.jornadaStatusStart}>
                  Ingreso: {selectedEntry.start}
                </span>
              </div>
              <span className={styles.jornadaCounterLabel}>Tiempo trabajado</span>
              <strong className={styles.jornadaCounter}>{formatSeconds(liveTimeSummary.workedSeconds)}</strong>
              {selectedOpenBreak && (
                <div className={styles.jornadaAwayCounter}>
                  <span>Fuera desde las {selectedOpenBreak.start}</span>
                  <strong>{formatSeconds(liveTimeSummary.currentBreakSeconds)}</strong>
                </div>
              )}
            </section>
          ) : selectedDateIsToday && !selectedEntry ? (
            <section className={styles.jornadaEmptyState} aria-label="Jornada sin iniciar">
              <span className={styles.jornadaStateBadge}>Jornada sin iniciar</span>
              <h3>Empezá tu jornada</h3>
              <p>Registrá tu ingreso con la hora actual. El horario se guarda automáticamente.</p>
            </section>
          ) : null}

          {selectedDateIsToday && (!selectedEntry || selectedEntryIsOpen) && (
            <section className={styles.jornadaActions} aria-label="Acciones de fichaje">
              <h3>Acciones de fichaje</h3>
              {!selectedEntry && !selectedEntryIsOpen && (
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.jornadaAction} ${styles.jornadaActionPrimary} ${styles.clockInButton}`}
                  onClick={handleClockIn}
                >
                  <span className={styles.clockActionIcon}><FiLogIn aria-hidden="true" /></span>
                  <span className={styles.jornadaActionText}>
                    <strong>Marcar ingreso</strong>
                    <small>Registrar tu hora de entrada</small>
                  </span>
                  <FiChevronRight className={styles.jornadaActionArrow} aria-hidden="true" />
                </button>
              )}
              {selectedEntryIsOpen && !selectedOpenBreak && (
                <>
                  <button
                    type="button"
                    className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.jornadaAction} ${styles.jornadaActionPrimary} ${styles.temporaryExitButton}`}
                    onClick={handleTemporaryExit}
                  >
                    <span className={styles.jornadaActionIcon}><FiArrowUpRight aria-hidden="true" /></span>
                    <span className={styles.jornadaActionText}>
                      <strong>Marcar salida transitoria</strong>
                      <small>Registrar el inicio de una salida temporal</small>
                    </span>
                    <FiChevronRight className={styles.jornadaActionArrow} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${buttonStyles.button} ${buttonStyles.secondary} ${styles.jornadaAction} ${styles.jornadaActionSecondary}`}
                    onClick={handleClockOut}
                  >
                    <span className={styles.jornadaActionIcon}><FiLogOut aria-hidden="true" /></span>
                    <span className={styles.jornadaActionText}>
                      <strong>Finalizar jornada</strong>
                      <small>Registrar tu salida y cerrar la jornada</small>
                    </span>
                    <FiChevronRight className={styles.jornadaActionArrow} aria-hidden="true" />
                  </button>
                </>
              )}
              {selectedEntryIsOpen && selectedOpenBreak && (
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.jornadaAction} ${styles.jornadaActionPrimary} ${styles.returnButton}`}
                  onClick={handleReturn}
                >
                  <span className={styles.jornadaActionIcon}><FiCornerDownLeft aria-hidden="true" /></span>
                  <span className={styles.jornadaActionText}>
                    <strong>Marcar reingreso</strong>
                    <small>Registrar tu regreso al trabajo</small>
                  </span>
                  <FiChevronRight className={styles.jornadaActionArrow} aria-hidden="true" />
                </button>
              )}
            </section>
          )}

          {selectedEntryIsOpen && (
            <section className={styles.jornadaRecord} aria-label="Registro de la jornada">
              <div className={styles.jornadaSectionTitle}>
                <h3>Registro {selectedDateIsToday ? 'de hoy' : 'del día'}</h3>
                <span>Horarios registrados</span>
              </div>
              <dl className={styles.jornadaRecordTimes}>
                <div><dt>Entrada</dt><dd>{selectedEntry.start}</dd></div>
                <div><dt>Salida definitiva</dt><dd>Pendiente</dd></div>
              </dl>
              <div className={styles.jornadaBreaksTitle}>
                <strong>Salidas transitorias</strong>
                <span>{persistedBreaks.length} {persistedBreaks.length === 1 ? 'salida' : 'salidas'}</span>
              </div>
              {persistedBreaks.length > 0 ? (
                <ol className={styles.jornadaBreaksList}>
                  {persistedBreaks.map((workBreak, index) => (
                    <li key={index}>
                      <span>Salida {index + 1}</span>
                      <strong>{workBreak.start || '—'} – {workBreak.end || 'En curso'}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.jornadaNoBreaks}>Todavía no registraste salidas transitorias.</p>
              )}
              {persistedBreaks.length > 0 && (
                <p className={styles.jornadaBreakTotal}>
                  Tiempo fuera: {formatMinutes(getBreakMinutes(selectedEntry, {
                    includeOpenUntil: selectedOpenBreak ? getCurrentTime() : null,
                  }))}
                </p>
              )}
            </section>
          )}

          {!selectedDateIsToday && (
            <p className={styles.clockHelpText}>
              Para esta fecha no se puede fichar automáticamente. Podés cargar o corregir los horarios manualmente.
            </p>
          )}

          {selectedDateIsToday && canMarkAbsence && (
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.secondary} ${styles.jornadaAbsenceButton}`}
              onClick={handleOpenAbsenceModal}
            >
              Marcar ausencia en lugar de ingresar
            </button>
          )}

          {(hasPendingBreakChanges || hasPendingTimeChanges) && (
            <div className={styles.jornadaPendingNotice} role="status">
              <strong>Tenés modificaciones sin guardar.</strong>
              <span>
                {hasPendingBreakChanges && hasPendingTimeChanges
                  ? 'Revisá el horario y las salidas transitorias en «Corregir horarios manualmente».'
                  : hasPendingBreakChanges
                    ? 'Abrí «Corregir horarios manualmente» y aplicá los cambios en las salidas.'
                    : 'Abrí «Corregir horarios manualmente» y guardá el horario indicado.'}
              </span>
            </div>
          )}

          <section className={styles.jornadaCorrections} aria-label="Correcciones manuales">
            <button
              type="button"
              className={styles.jornadaCorrectionsToggle}
              aria-expanded={manualCorrectionsOpen}
              aria-controls="jornada-manual-fields"
              onClick={() => setManualCorrectionsOpen((open) => !open)}
            >
              <span className={styles.jornadaCorrectionsIcon}><FiEdit aria-hidden="true" /></span>
              <span className={styles.jornadaCorrectionsText}>
                <strong>{selectedDateIsToday ? 'Corregir horarios manualmente' : 'Cargar horarios manualmente'}</strong>
                <small>Modificar entrada, salida o salidas transitorias</small>
              </span>
              <FiChevronDown className={`${styles.jornadaChevron} ${manualCorrectionsOpen ? styles.jornadaChevronOpen : ''}`} aria-hidden="true" />
            </button>
            <div id="jornada-manual-fields" className={styles.jornadaCorrectionsContent} hidden={!manualCorrectionsOpen}>
              <p className={styles.jornadaCorrectionsHelp}>
                Los horarios que escribas no se guardan hasta que confirmes. Si guardás entrada y salida, la jornada queda cerrada.
              </p>

              <div className={styles.timeEntryInputs}>
                <div className={styles.timeEntryInputGroup}>
                  <label htmlFor="jornada-start-time">ENTRADA</label>
                  <input
                    id="jornada-start-time"
                    type="time"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    className={showValidation && !startTime ? styles.inputError : ''}
                  />
                </div>
                <div className={styles.timeEntryInputGroup}>
                  <label htmlFor="jornada-end-time">SALIDA</label>
                  <input
                    id="jornada-end-time"
                    type="time"
                    value={endTime}
                    onChange={(event) => {
                      setEndTime(event.target.value);
                      setShowValidation(false);
                    }}
                    className={showValidation && !endTime ? styles.inputError : ''}
                  />
                </div>
              </div>
              <div className={styles.jornadaManualButtons}>
                <button
                  type="button"
                  className={`${buttonStyles.button} ${buttonStyles.primary}`}
                  onClick={handleSave}
                >
                  Guardar horario indicado
                </button>
                {selectedEntryIsOpen && (
                  <button
                    type="button"
                    className={`${buttonStyles.button} ${buttonStyles.tertiary}`}
                    onClick={handleCloseEntry}
                    disabled={!startTime || !endTime}
                  >
                    Cerrar jornada con horario indicado
                  </button>
                )}
              </div>
              {selectedEntryIsOpen && (selectedBreaks.length > 0 || persistedBreaks.length > 0) && (
                <details className={styles.jornadaBreakEditor}>
                  <summary>
                    <span>Editar salidas transitorias</span>
                    {hasPendingBreakChanges && <span className={styles.jornadaPendingTag}>Cambios pendientes</span>}
                    <FiChevronDown className={styles.jornadaChevron} aria-hidden="true" />
                  </summary>
                  <div className={styles.breakSummary}>
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
                          <FiX aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    <small>Modificá o eliminá una salida y después aplicá los cambios.</small>
                    <button
                      type="button"
                      className={`${buttonStyles.button} ${buttonStyles.secondary} ${styles.jornadaSaveBreaksButton}`}
                      onClick={handleSaveBreaks}
                      disabled={!hasPendingBreakChanges}
                    >
                      {hasPendingBreakChanges ? 'Aplicar cambios en salidas' : 'Salidas sin cambios'}
                    </button>
                  </div>
                </details>
              )}
              {!selectedDateIsToday && canMarkAbsence && (
                <div className={styles.jornadaManualAbsence}>
                  <span>¿Necesitás registrar una ausencia en esta fecha?</span>
                  <button
                    type="button"
                    className={`${buttonStyles.button} ${buttonStyles.secondary}`}
                    onClick={handleOpenAbsenceModal}
                  >
                    Marcar ausencia
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      </section>

      <EditorRegistro
        isOpen={Boolean(editingRecord)}
        dateStr={editingRecord?.dateStr}
        entry={editingRecord?.entry}
        onClose={() => setEditingRecord(null)}
      />
      <ModalEditar isOpen={absenceModalOpen} onClose={handleCancelAbsence} presentation="sheet">
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
