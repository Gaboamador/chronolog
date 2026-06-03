import React, { useState, useEffect, useContext } from 'react';
import Context from '../context';
import '../estilos/FormularioHora.scss';
import '../estilos/Botones.scss';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import ModalEditar from './ModalEditar';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
  getAbsenceReasonLabel,
  isJustifiedAbsenceEntry,
  isResolvedEntry,
  isWorkedEntry,
} from '../utils/entries/entriesStatus';
import {
  buildJustifiedAbsenceEntry,
  buildWorkedEntry,
} from '../utils/entries/buildEntries';

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
    <div className="container-main calendar">
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
          justifiedAbsence: 'rdp-day-justified-absence',
        }}
      />

      {entryExists && (
        <div className="entrada-salida-container">
          {selectedEntryIsWorked && (
            <div className="entry-status-message">
              Día cargado: {selectedEntry.start} a {selectedEntry.end}
            </div>
          )}

          {selectedEntryIsAbsence && (
            <div className="entry-status-message">
              Ausencia justificada: {getAbsenceReasonLabel(selectedEntry.absenceReason)}
            </div>
          )}
        </div>
      )}

      {!entryExists && (
        <div className="entrada-salida-container">
          <div className="entrada-salida-inputs">
            <div className="entrada-salida-input-children">
              <label>ENTRADA</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={showValidation && !startTime ? 'input-error' : ''}
              />
            </div>

            <div className="entrada-salida-input-children">
              <label>SALIDA</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={showValidation && !endTime ? 'input-error' : ''}
              />
            </div>
          </div>

          <button className="button" onClick={handleSave}>
            GUARDAR HORARIO
          </button>

          <button className="button button--secondary" onClick={handleOpenAbsenceModal}>
            MARCAR AUSENCIA
          </button>
        </div>
      )}

      <ModalEditar isOpen={absenceModalOpen} onClose={handleCancelAbsence}>
        <div className="entrada-salida-container modal">
          <div className="modal-title">MARCAR AUSENCIA</div>

          <div className="absence-form">
            <div className="absence-field">
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

          <div className="botones-modal-container">
            <div className="botones-modal-eliminar-cancelar">
              <button className="button" onClick={handleCancelAbsence}>
                CANCELAR
              </button>

              <button className="button button--save" onClick={handleSaveAbsence}>
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