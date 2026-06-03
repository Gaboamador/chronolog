import React from 'react';
import '../estilos/Loader.scss'

function Loader() {
  return (
    <div className="loader-container">
      <div className="spinner" />
      <p className="loader-text">Verificando sesión...</p>
    </div>
  );
}

export default Loader;
