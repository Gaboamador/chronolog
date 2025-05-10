import React from 'react';
import '../estilos/ModalEditar.scss';

const ModalEditar = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default ModalEditar;
