import React, { useState, useContext } from 'react';
import Context from '../context';
import '../estilos/Header.scss';
import isologo from '../isologo.svg'
import HorarioPersonal from '../componentes/HorarioPersonal'
import Logout from './Logout';
import { IoMdSettings } from "react-icons/io";
import { FiMenu, FiLogOut } from "react-icons/fi";


const Header = () => {

  const context = useContext(Context)
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);



  return (
    <header className="app-header">
  <div className="header-content">
    <div className="isologo-container">
      <img src={isologo} alt={""} className="isologo" />
    </div>

    {context.user && (
      <div className="menu-button-container">
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="menu-button"
        >
          <FiMenu className={`menu-icon ${menuOpen ? "active" : ""}`} />
        </button>

        {menuOpen && (
          <ul className="menu-dropdown">
            <li>{context.user.email}</li>
            <li
              onClick={() => {
                setShowHorarioModal(true);
                setMenuOpen(false);
              }}
            >
              <IoMdSettings className="settings-icon" />
              Ajustes
            </li>
            <li
              onClick={() => {
                context.logout();
                setMenuOpen(false);
              }}
            >
              <FiLogOut className="settings-icon" />
              Cerrar sesión
            </li>
          </ul>
        )}
      </div>
    )}

    {showHorarioModal && (
      <HorarioPersonal onClose={() => setShowHorarioModal(false)} />
    )}
  </div>
</header>
  );
};

export default Header;
