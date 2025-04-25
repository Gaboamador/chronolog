import React from 'react';
import '../estilos/ModalEditar.css';

const ModalEditar = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="content" onClick={e => e.stopPropagation()}>
        <button style={{ float: 'right' }} onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
};

export default ModalEditar;
