import React, { useState, useContext } from 'react';
import Context from '../context';
import '../estilos/Header.scss';
import isologo from '../isologo.svg'
import HorarioPersonal from '../componentes/HorarioPersonal'
import ActualizarPerfil from './ActualizarPerfil';
import { IoMdSettings } from "react-icons/io";
import { FiMenu, FiLogOut, FiX } from "react-icons/fi";
import { FaUserEdit } from "react-icons/fa";


const Header = () => {

  const context = useContext(Context)
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
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
  <div className={`hamburger ${menuOpen ? "is-active" : ""}`}>
    <span className="hamburger-line"></span>
    <span className="hamburger-line"></span>
    <span className="hamburger-line"></span>
  </div>
</button>
        {/* <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="menu-button"
        >
        <div className={`menu-icon-container ${menuOpen ? "active" : ""}`}>
          <FiMenu className="menu-icon" />
          <FiX className="close-icon" />
        </div>
        </button> */}

        {menuOpen && (
          <ul className="menu-dropdown">
            <li>{context.user?.displayName || 'Usuario'}</li>
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
            <li onClick={() => setShowPerfilModal(true)}>
              <FaUserEdit className="settings-icon" />
              Actualizar perfil
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

    {showPerfilModal && (
      <ActualizarPerfil onClose={() => setShowPerfilModal(false)} />
    )}

  </div>
</header>
  );
};

export default Header;
