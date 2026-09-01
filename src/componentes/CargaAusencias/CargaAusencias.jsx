import React, { useContext, useState } from 'react';
import Context from '@/context';
import ModalEditar from '@/componentes/ModalEditar';
import ConfirmModal from '@/componentes/ConfirmModal';
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
} from '@/utils/entries/entriesStatus';
import { buildJustifiedAbsenceEntry } from '@/utils/entries/buildEntries';
import buttonStyles from '@/styles/Botones.module.scss';
import modalStyles from '@/componentes/ModalEditar/ModalEditar.module.scss';
import styles from './CargaAusencias.module.scss';

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
  const [saving, setSaving] = useState(false);

  const applyAbsences = async (datesToApply) => {
    if (saving) return;
    const absenceEntries = datesToApply.map((date) =>
        buildJustifiedAbsenceEntry({
        date,
        absenceReason,
        })
    );

    try {
      setSaving(true);
      const persisted = await context.persistEntries(absenceEntries);
      if (!persisted) {
        setError('No se pudieron guardar las ausencias. Revisá la conexión e intentá nuevamente.');
        setReplaceConfirmOpen(false);
        return;
      }
      setReplaceConfirmOpen(false);
      setPendingDatesToApply([]);
      onClose();
    } catch (saveError) {
      console.error('Error guardando ausencias:', saveError);
      setError('No se pudieron guardar las ausencias. Revisá la conexión e intentá nuevamente.');
      setReplaceConfirmOpen(false);
    } finally {
      setSaving(false);
    }
    };

  const handleSave = async () => {
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

    let existingEntries;
    try {
      existingEntries = (await context.fetchEntriesInRange(
        datesToApply[0],
        datesToApply[datesToApply.length - 1]
      )).filter((entry) => datesToApply.includes(entry.date));
    } catch (loadError) {
      console.error('Error comprobando ausencias existentes:', loadError);
      setError('No se pudo comprobar el rango. Revisá la conexión e intentá nuevamente.');
      return;
    }

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
      <div className={`${styles.timeEntryContainer} ${styles.timeEntryContainerModal} ${modalStyles.timeEntryContainer} ${modalStyles.modalSurface}`}>
        <div className={modalStyles.modalTitle}>CARGAR AUSENCIAS</div>

        <div className={`${styles.absenceForm} ${modalStyles.absenceForm}`}>
          {error && (
            <div className={`${styles.absenceError} ${modalStyles.absenceError}`}>
              {error}
            </div>
          )}

          <div className={`${styles.absenceField} ${modalStyles.absenceField}`}>
            <label>Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className={`${styles.absenceField} ${modalStyles.absenceField}`}>
            <label>Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

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

          <div className={`
              ${styles.absencePreview}
              ${modalStyles.absencePreview}
              ${startDate && endDate ? styles.absencePreviewActive : ''}
            `}>
            {startDate && endDate
              ? `${getBusinessDatesInRange(startDate, endDate).length} día(s) hábiles a marcar`
              : 'Seleccioná un rango de fechas'}
          </div>
        </div>

        <div className={modalStyles.modalButtonsContainer}>
          <div className={modalStyles.modalDeleteCancelButtons}>
            <button className={`${buttonStyles.button} ${buttonStyles.secondary} ${modalStyles.button}`} onClick={onClose} disabled={saving}>
              CANCELAR
            </button>

            <button className={`${buttonStyles.button} ${buttonStyles.primary} ${modalStyles.button}`} onClick={handleSave} disabled={saving}>
              {saving ? 'GUARDANDO…' : 'GUARDAR'}
            </button>
          </div>
        </div>
      </div>
    </ModalEditar>
    <ConfirmModal
      isOpen={replaceConfirmOpen}
      title="Reemplazar cargas existentes"
      message={`El rango incluye ${pendingDatesToApply.length} día(s) que ya tienen una carga. Si continuás, se reemplazarán por ausencia justificada.`}
      confirmText={saving ? 'Guardando…' : 'Reemplazar'}
      cancelText="Cancelar"
      danger
      onConfirm={() => applyAbsences(pendingDatesToApply)}
      onCancel={() => {
        if (saving) return;
        setReplaceConfirmOpen(false);
        setPendingDatesToApply([]);
      }}
    />
    </>
  );
};

export default CargaAusencias;
