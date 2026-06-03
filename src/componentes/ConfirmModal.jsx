import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../estilos/ConfirmModal.scss';
import '../estilos/Botones.scss';

const ConfirmModal = ({
  isOpen,
  title = 'Confirmar acción',
  message = '¿Querés continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-modal-overlay"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={[
              'confirm-modal-content',
              danger ? 'confirm-modal-content--danger' : '',
            ].join(' ').trim()}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div id="confirm-modal-title" className="confirm-modal-title">
              {title}
            </div>

            <div className="confirm-modal-message">
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="button"
                onClick={onCancel}
              >
                {cancelText}
              </button>

              <button
                type="button"
                className={[
                  'button',
                  danger ? 'button--danger' : 'button--save',
                ].join(' ')}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;