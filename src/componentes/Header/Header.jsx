import React, { useState, useContext, useEffect, useRef } from 'react';
import Context from '@/context';
import isologo from '@/isologo.svg'
import HorarioPersonal from '@/componentes/HorarioPersonal'
import ActualizarPerfil from '@/componentes/ActualizarPerfil';
import MenuDataActions from '@/componentes/MenuDataActions';
import CargaAusencias from '@/componentes/CargaAusencias';
import { MdEventBusy } from 'react-icons/md';
import { IoMdSettings } from "react-icons/io";
import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { FaUserEdit } from "react-icons/fa";
import { FiCheckCircle, FiCloudOff, FiAlertTriangle, FiRefreshCw, FiUploadCloud } from 'react-icons/fi';
import styles from './Header.module.scss';
import { FiMoon } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';


const Header = ({ hideUserMenu = false, mobileNavigationEnabled = false, mobileMoreOpen = false, onCloseMobileMore }) => {

  const context = useContext(Context)
  const { preference, setPreference } = useTheme();
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [showCargaAusenciasModal, setShowCargaAusenciasModal] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const menuOpen = desktopMenuOpen || mobileMoreOpen;
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const menuScrollRef = useRef(null);

  useEffect(() => {
    const updateScrollBoundary = () => {
      const pageScroll = window.scrollY || document.documentElement.scrollTop || 0;
      const menuScroll = menuScrollRef.current?.scrollTop || 0;
      setHeaderScrolled(pageScroll >= 1 || menuScroll >= 1);
    };

    updateScrollBoundary();
    window.addEventListener('scroll', updateScrollBoundary, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollBoundary);
  }, [menuOpen]);

  // Solo representa el estado existente del hook de entradas, sin iniciar sincronizaciones.
  const syncPresentation = {
    synced: { Icon: FiCheckCircle, label: 'Sincronizado', detail: 'Todos los cambios registrados están sincronizados.' },
    syncing: { Icon: FiRefreshCw, label: 'Sincronizando…', detail: 'Se están sincronizando cambios.' },
    offline: { Icon: FiCloudOff, label: 'Sin conexión', detail: 'Se muestran datos guardados localmente. Se sincronizarán cuando se restablezca la conexión.' },
    error: { Icon: FiAlertTriangle, label: 'Error de sincronización', shortLabel: 'Error al sincronizar', detail: 'Hubo un error al sincronizar. Revisá tu conexión.' },
    migration: {
      Icon: FiUploadCloud,
      label: context.legacyUnassignedCount > 0 ? 'Datos anteriores sin asociar' : 'Datos anteriores por importar',
      shortLabel: 'Datos por importar',
      detail: 'Hay datos anteriores que requieren revisión antes de continuar.',
    },
  }[context.syncStatus];
  const closeMenu = () => {
    setDesktopMenuOpen(false);
    onCloseMobileMore?.();
  };



  return (
    <header className={`${styles.appHeader} ${mobileNavigationEnabled ? styles.withMobileNavigation : ''}`}>
  <div className={`${styles.headerContent} ${headerScrolled ? styles.headerContentScrolled : ''}`}>
    <div className={styles.isologoContainer}>
      <img src={isologo} alt={""} className={styles.isologo} />
    </div>

    {context.user && !hideUserMenu && (
      <div className={styles.menuButtonContainer}>
      {syncPresentation && (
        <div
          className={`${styles.syncIndicator} ${styles[`sync_${context.syncStatus}`]}`}
          role={context.syncStatus === 'error' ? 'alert' : 'status'}
          title={syncPresentation.detail}
          aria-label={`${syncPresentation.label}. ${syncPresentation.detail}`}
        >
          <syncPresentation.Icon aria-hidden="true" className={styles.syncIcon} />
          <span className={styles.syncLabel}>{syncPresentation.label}</span>
          {syncPresentation.shortLabel && <span className={styles.syncShortLabel}>{syncPresentation.shortLabel}</span>}
        </div>
      )}
      <button
        onClick={() => {
          onCloseMobileMore?.();
          setDesktopMenuOpen((prev) => !prev);
        }}
        className={styles.menuButton}
        type="button"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        {menuOpen ? <FiX className={styles.menuGlyph} aria-hidden="true" /> : <FiMenu className={styles.menuGlyph} aria-hidden="true" />}
      </button>

        {menuOpen && (
          <ul
            ref={menuScrollRef}
            className={`${styles.menuDropdown} ${mobileMoreOpen && !desktopMenuOpen ? styles.moreOnly : ''}`}
            aria-label={mobileMoreOpen ? 'Más opciones' : 'Menú de usuario'}
            onScroll={(event) => {
              setHeaderScrolled(window.scrollY >= 1 || event.currentTarget.scrollTop >= 1);
            }}
          >
            <li className={styles.mobileMoreHeading}>
              <span className={styles.mobileMoreEyebrow}>Cuenta y herramientas</span>
              <h2>Más</h2>
            </li>
            <li className={styles.profileName}>{context.profileComplete
              ? `${context.profile.firstName} ${context.profile.lastName}`
              : context.user?.displayName || 'Usuario'}</li>
            <li className={styles.profileEmail}>{context.user.email}</li>
            <li>
              <button type="button" className={styles.menuAction} onClick={() => {
                setShowHorarioModal(true);
                closeMenu();
              }}>
                <IoMdSettings className={styles.settingsIcon} />
                Ajustes
              </button>
            </li>
            <li className={styles.themePreferenceRow}>
              <label className={styles.themePreferenceLabel} htmlFor="chronolog-theme-preference">
                <FiMoon aria-hidden="true" className={styles.settingsIcon} />
                Apariencia
              </label>
              <select
                id="chronolog-theme-preference"
                aria-label="Tema de la aplicación"
                className={styles.themePreferenceSelect}
                value={preference}
                onChange={(event) => setPreference(event.target.value)}
              >
                <option value="dark">Oscuro</option>
                <option value="light">Claro</option>
                <option value="system">Automático</option>
              </select>
            </li>
            <li className={styles.bottomDivider}>
              <button type="button" className={styles.menuAction} onClick={() => {
                setShowPerfilModal(true);
                closeMenu();
              }}>
                <FaUserEdit className={styles.settingsIcon} />
                Actualizar perfil
              </button>
            </li>
            <li className={styles.dividerAbove}>
              <button type="button" className={styles.menuAction} onClick={() => {
                setShowCargaAusenciasModal(true);
                closeMenu();
              }}>
                <MdEventBusy className={styles.settingsIcon} />
                Cargar ausencias prolongadas
              </button>
            </li>
            <MenuDataActions onActionComplete={closeMenu} />
            <li className={styles.dividerAbove}>
              <button type="button" className={styles.menuAction} onClick={() => {
                context.logout();
                closeMenu();
              }}>
                <FiLogOut className={styles.settingsIcon} />
                Cerrar sesión
              </button>
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
