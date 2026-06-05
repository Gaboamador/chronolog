import React from 'react';
import styles from './Loader.module.scss';

function Loader() {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.spinner} />
      <p className={styles.loaderText}>Verificando sesión...</p>
    </div>
  );
}

export default Loader;
