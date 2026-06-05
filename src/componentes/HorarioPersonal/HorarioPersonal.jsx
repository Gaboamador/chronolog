import React, { useState, useContext } from 'react';
import Context from '@/context';
import ModalEditar from '@/componentes/ModalEditar';
import { guardarHorarioPorDefecto } from '@/services/firebase/userSettingsService';
import buttonStyles from '@/styles/Botones.module.scss';
import modalStyles from '@/componentes/ModalEditar/ModalEditar.module.scss';

const HorarioPersonal = ({ onClose }) => {
  const context = useContext(Context);
const { user, defaultWorkTime, setDefaultWorkTime } = context;

  const [defaultStart, setDefaultStart] = useState(defaultWorkTime.defaultPersonalStartTime);
  const [defaultEnd, setDefaultEnd] = useState(defaultWorkTime.defaultPersonalEndTime);

  const handleSaveDefaults = async () => {
    const nuevosValores = {
      defaultPersonalStartTime: defaultStart,
      defaultPersonalEndTime: defaultEnd,
    };
    setDefaultWorkTime(nuevosValores);

    if (user) {
      await guardarHorarioPorDefecto(user.uid, defaultStart, defaultEnd);
    }

    onClose();
  };

  return (
    <ModalEditar isOpen={true} onClose={onClose} permitirCerrar={!context.necesitaConfigurarHorario}>
      <div className={`${modalStyles.timeEntryContainer} ${modalStyles.modalSurface}`}>
        <div className={modalStyles.modalTitle}>HORARIO POR DEFECTO</div>

        {context.necesitaConfigurarHorario && (
        <div className={modalStyles.modalAlert}>
          Antes de comenzar, por favor configurá tu horario por defecto.<br />
          Luego podrás modificarlo desde la sección de ajustes.
        </div>
        )}

        <div className={modalStyles.timeEntryInputs}>
          <div className={modalStyles.timeEntryInputGroup}>
            <label>ENTRADA</label>
            <input
              type="time"
              value={defaultStart}
              onChange={(e) => setDefaultStart(e.target.value)}
            />
          </div>

          <div className={modalStyles.timeEntryInputGroup}>
            <label>SALIDA</label>
            <input
              type="time"
              value={defaultEnd}
              onChange={(e) => setDefaultEnd(e.target.value)}
            />
          </div>
        </div>

        <div className={modalStyles.modalButtonsContainer}>
          <button className={`${buttonStyles.button} ${buttonStyles.primary} ${modalStyles.button}`} onClick={handleSaveDefaults}>
            Guardar
          </button>
          {!context.necesitaConfigurarHorario && (
            <div className={modalStyles.modalDeleteCancelButtons}>
              <button className={`${buttonStyles.button} ${buttonStyles.secondary} ${modalStyles.button}`} onClick={onClose}>
                Cancelar
              </button>
            </div>
          )}

        </div>
      </div>
    </ModalEditar>
  );
};

export default HorarioPersonal;
