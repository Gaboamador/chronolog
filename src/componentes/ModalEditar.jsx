import React from 'react';
import '../estilos/ModalEditar.scss';

const ModalEditar = ({ isOpen, onClose, children, permitirCerrar = true }) => {
  if (!isOpen) return null;
  return (
    <div
    className="overlay"
    // onClick={onClose}
    onClick={() => {
    if (permitirCerrar) onClose();
  }}
    >
      <div className="content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default ModalEditar;
