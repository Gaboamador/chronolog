import React, { useState, useContext } from 'react';
import Context from '../context';
import '../estilos/Header.scss';
import isologo from '../isologo.svg'
import HorarioPersonal from '../componentes/HorarioPersonal'
import ActualizarPerfil from './ActualizarPerfil';
import MenuDataActions from './MenuDataActions';
import CargaAusencias from './CargaAusencias';
import { MdEventBusy } from 'react-icons/md';
import { IoMdSettings } from "react-icons/io";
import { FiLogOut } from "react-icons/fi";
import { FaUserEdit } from "react-icons/fa";


const Header = () => {

  const context = useContext(Context)
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [showCargaAusenciasModal, setShowCargaAusenciasModal] = useState(false);
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
            <li
              className="bottom-divider"
              onClick={() => {
                setShowPerfilModal(true);
                setMenuOpen(false);
              }}
            >
              <FaUserEdit className="settings-icon" />
              Actualizar perfil
            </li>
            <li
              className="divider-above"
              onClick={() => {
                setShowCargaAusenciasModal(true);
                setMenuOpen(false);
              }}
            >
              <MdEventBusy className="settings-icon" />
              Cargar ausencias
            </li>
            <MenuDataActions onActionComplete={() => setMenuOpen(false)} />
            <li
              className="divider-above"
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

    {showCargaAusenciasModal && (
      <CargaAusencias onClose={() => setShowCargaAusenciasModal(false)} />
    )}

  </div>
</header>
  );
};

export default Header;
