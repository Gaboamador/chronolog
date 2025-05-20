import React, { useState, useContext } from 'react';
import Context from '../context';
import ModalEditar from './ModalEditar';
import '../estilos/ModalEditar.scss';
import '../estilos/Botones.scss';
import { guardarHorarioPorDefecto } from '../firebaseUtils';

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
      <div className="entrada-salida-container modal">
        <div className="modal-title">HORARIO POR DEFECTO</div>

        {context.necesitaConfigurarHorario && (
        <div className="modal-alerta">
          Antes de comenzar, por favor configurá tu horario por defecto.<br />
          Luego podrás modificarlo desde la sección de ajustes.
        </div>
        )}

        <div className="entrada-salida-inputs">
          <div className="entrada-salida-input-children">
            <label>ENTRADA</label>
            <input
              type="time"
              value={defaultStart}
              onChange={(e) => setDefaultStart(e.target.value)}
            />
          </div>

          <div className="entrada-salida-input-children">
            <label>SALIDA</label>
            <input
              type="time"
              value={defaultEnd}
              onChange={(e) => setDefaultEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="botones-modal-container">
          <button className="button button--save" onClick={handleSaveDefaults}>
            Guardar
          </button>
          {!context.necesitaConfigurarHorario && (
            <div className="botones-modal-eliminar-cancelar">
              <button className="button" onClick={onClose}>
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
