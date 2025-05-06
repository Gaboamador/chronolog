import React, { useState } from 'react';
import '../estilos/Header.css';
import logo from '../logo.svg';
import HorarioPersonal from '../componentes/HorarioPersonal'
import { IoMdSettings } from "react-icons/io";

const Header = () => {

  const [showHorarioModal, setShowHorarioModal] = useState(false);

  return (
    <header className="app-header">
      <img src={logo} alt={""} className="logo"/>
      <div className="app-title">CONTROL HORARIO</div>
      <button onClick={() => setShowHorarioModal(true)} className="settings-button">
        <IoMdSettings className="settings-icon"/>
      </button>

      {showHorarioModal && (
        <HorarioPersonal onClose={() => setShowHorarioModal(false)} />
      )}
    </header>
  );
};

export default Header;
