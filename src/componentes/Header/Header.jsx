import React, { useState, useContext } from 'react';
import Context from '@/context';
import isologo from '@/isologo.svg'
import HorarioPersonal from '@/componentes/HorarioPersonal'
import ActualizarPerfil from '@/componentes/ActualizarPerfil';
import MenuDataActions from '@/componentes/MenuDataActions';
import CargaAusencias from '@/componentes/CargaAusencias';
import { MdEventBusy } from 'react-icons/md';
import { IoMdSettings } from "react-icons/io";
import { FiLogOut } from "react-icons/fi";
import { FaUserEdit } from "react-icons/fa";
import styles from './Header.module.scss';


const Header = ({ hideUserMenu = false }) => {

  const context = useContext(Context)
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [showCargaAusenciasModal, setShowCargaAusenciasModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);



  return (
    <header className={styles.appHeader}>
  <div className={styles.headerContent}>
    <div className={styles.isologoContainer}>
      <img src={isologo} alt={""} className={styles.isologo} />
    </div>

    {context.user && !hideUserMenu && (
      <div className={styles.menuButtonContainer}>
      <button
        onClick={() => setMenuOpen(prev => !prev)}
        className={styles.menuButton}
      >
        <div className={`${styles.hamburger} ${menuOpen ? styles.isActive : ""}`}>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </div>
      </button>

        {menuOpen && (
          <ul className={styles.menuDropdown}>
            <li>{context.user?.displayName || 'Usuario'}</li>
            <li>{context.user.email}</li>
            <li
              onClick={() => {
                setShowHorarioModal(true);
                setMenuOpen(false);
              }}
            >
              <IoMdSettings className={styles.settingsIcon} />
              Ajustes
            </li>
            <li
              className={styles.bottomDivider}
              onClick={() => {
                setShowPerfilModal(true);
                setMenuOpen(false);
              }}
            >
              <FaUserEdit className={styles.settingsIcon} />
              Actualizar perfil
            </li>
            <li
              className={styles.dividerAbove}
              onClick={() => {
                setShowCargaAusenciasModal(true);
                setMenuOpen(false);
              }}
            >
              <MdEventBusy className={styles.settingsIcon} />
              Cargar ausencias
            </li>
            <MenuDataActions onActionComplete={() => setMenuOpen(false)} />
            <li
              className={styles.dividerAbove}
              onClick={() => {
                context.logout();
                setMenuOpen(false);
              }}
            >
              <FiLogOut className={styles.settingsIcon} />
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
