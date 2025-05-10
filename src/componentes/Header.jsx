import React, { useState } from 'react';
import '../estilos/Header.scss';
import isologo from '../isologo.svg'
import HorarioPersonal from '../componentes/HorarioPersonal'
import { IoMdSettings } from "react-icons/io";
import { FiMenu } from "react-icons/fi";

const Header = () => {

  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);



  return (
    <header className="app-header">
    <div className="header-content">
      <div className="isologo-container">
            <img src={isologo} alt={""} className="isologo"/>
      </div>
        <div className="menu-button-container">
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="menu-button"
        >
          <FiMenu className="menu-icon" />
        </button>
</div>
        {menuOpen && (
          <ul className="menu-dropdown">
            <li
              onClick={() => {
                setShowHorarioModal(true);
                setMenuOpen(false);
              }}
            >
              <IoMdSettings className="settings-icon"/>
              Ajustes
            </li>
          </ul>
        )}
      </div>
      {showHorarioModal && (
        <HorarioPersonal onClose={() => setShowHorarioModal(false)} />
      )}
    </header>
  );
};

export default Header;
