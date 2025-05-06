import React, { useState } from 'react';
import ModalEditar from './ModalEditar';
import { getDefaultWorkTime, setDefaultWorkTime } from '../utils/HorarioUtils';
import '../estilos/ModalEditar.css'; // Reuse existing styles

const HorarioPersonal = ({ onClose }) => {
  const { defaultPersonalStartTime, defaultPersonalEndTime } = getDefaultWorkTime();
  const [defaultStart, setDefaultStart] = useState(defaultPersonalStartTime);
  const [defaultEnd, setDefaultEnd] = useState(defaultPersonalEndTime);

  const handleSaveDefaults = () => {
    setDefaultWorkTime(defaultStart, defaultEnd);
    onClose();
  };

  return (
    <ModalEditar isOpen={true} onClose={onClose}>
      <div className="entrada-salida-container modal">
        <div className="modal-title">HORARIO POR DEFECTO</div>
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
          <div className="botones-modal-guardar-cancelar">
            <button onClick={onClose}>CANCELAR</button>
          </div>
          <button className="entrada-salida-button-borrar" onClick={handleSaveDefaults}>
            GUARDAR
          </button>
        </div>
      </div>
    </ModalEditar>
  );
};

export default HorarioPersonal;
