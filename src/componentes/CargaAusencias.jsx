import React, { useContext, useState } from 'react';
import Context from '../context';
import ModalEditar from './ModalEditar';
import ConfirmModal from './ConfirmModal';
import '../estilos/FormularioHora.scss';
import '../estilos/Botones.scss';
import {
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isWeekend,
  parseISO,
} from 'date-fns';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
} from '../utils/entries/entriesStatus';
import { buildJustifiedAbsenceEntry } from '../utils/entries/buildEntries';

function getBusinessDatesInRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return [];

  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  if (isAfter(startDate, endDate)) return [];

  return eachDayOfInterval({
    start: startDate,
    end: endDate,
  })
    .filter((date) => !isWeekend(date))
    .map((date) => format(date, 'yyyy-MM-dd'));
}

const CargaAusencias = ({ onClose }) => {
  const context = useContext(Context);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [absenceReason, setAbsenceReason] = useState(ABSENCE_REASONS.VACATION);
  const [error, setError] = useState('');
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [pendingDatesToApply, setPendingDatesToApply] = useState([]);

  const applyAbsences = (datesToApply) => {
    const absenceEntries = datesToApply.map((date) =>
        buildJustifiedAbsenceEntry({
        date,
        absenceReason,
        })
    );

    context.setEntries((prev) => [
        ...prev.filter((entry) => !datesToApply.includes(entry.date)),
        ...absenceEntries,
    ]);

    setReplaceConfirmOpen(false);
    setPendingDatesToApply([]);
    onClose();
    };

  const handleSave = () => {
    setError('');

    if (!startDate || !endDate) {
      setError('Seleccioná fecha desde y fecha hasta.');
      return;
    }

    const parsedStartDate = parseISO(startDate);
    const parsedEndDate = parseISO(endDate);

    if (isBefore(parsedEndDate, parsedStartDate)) {
      setError('La fecha hasta no puede ser anterior a la fecha desde.');
      return;
    }

    const datesToApply = getBusinessDatesInRange(startDate, endDate);

    if (datesToApply.length === 0) {
      setError('El rango no tiene días hábiles para marcar.');
      return;
    }

    const existingEntries = context.entries.filter((entry) =>
      datesToApply.includes(entry.date)
    );

    if (existingEntries.length > 0) {
    setPendingDatesToApply(datesToApply);
    setReplaceConfirmOpen(true);
    return;
    }

    applyAbsences(datesToApply);
  };

  return (
    <>
    <ModalEditar isOpen={true} onClose={onClose}>
      <div className="entrada-salida-container modal">
        <div className="modal-title">CARGAR AUSENCIAS</div>

        <div className="absence-form">
          {error && (
            <div className="absence-error">
              {error}
            </div>
          )}

          <div className="absence-field">
            <label>Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="absence-field">
            <label>Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

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

          <div className="absence-preview">
            {startDate && endDate
              ? `${getBusinessDatesInRange(startDate, endDate).length} día(s) hábiles a marcar`
              : 'Seleccioná un rango de fechas'}
          </div>
        </div>

        <div className="botones-modal-container">
          <div className="botones-modal-eliminar-cancelar">
            <button className="button" onClick={onClose}>
              CANCELAR
            </button>

            <button className="button button--save" onClick={handleSave}>
              GUARDAR
            </button>
          </div>
        </div>
      </div>
    </ModalEditar>
    <ConfirmModal
      isOpen={replaceConfirmOpen}
      title="Reemplazar cargas existentes"
      message={`El rango incluye ${pendingDatesToApply.length} día(s) que ya tienen una carga. Si continuás, se reemplazarán por ausencia justificada.`}
      confirmText="Reemplazar"
      cancelText="Cancelar"
      danger
      onConfirm={() => applyAbsences(pendingDatesToApply)}
      onCancel={() => {
        setReplaceConfirmOpen(false);
        setPendingDatesToApply([]);
      }}
    />
    </>
  );
};

export default CargaAusencias;