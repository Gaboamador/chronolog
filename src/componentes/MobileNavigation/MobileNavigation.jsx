import React from 'react';
import { FiCalendar, FiClock, FiMoreHorizontal, FiBarChart2 } from 'react-icons/fi';
import styles from './MobileNavigation.module.scss';

const destinations = [
  { id: 'jornada', label: 'Jornada', Icon: FiClock },
  { id: 'calendario', label: 'Calendario', Icon: FiCalendar },
  { id: 'resumen', label: 'Resumen', Icon: FiBarChart2 },
  { id: 'mas', label: 'Más', Icon: FiMoreHorizontal },
];

export default function MobileNavigation({ activeView, onViewChange }) {
  const activeIndex = Math.max(0, destinations.findIndex(({ id }) => id === activeView));

  return (
    <nav className={styles.navigation} aria-label="Navegación principal">
      <div className={styles.items} data-active-index={activeIndex}>
        <span className={styles.activeIndicator} aria-hidden="true" />
        {destinations.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${styles.item} ${activeView === id ? styles.active : ''}`}
            type="button"
            aria-current={activeView === id ? 'page' : undefined}
            onClick={() => onViewChange(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
