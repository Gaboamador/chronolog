import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import buttonStyles from '@/styles/Botones.module.scss';
import styles from './ConfirmModal.module.scss';

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
          className={styles.confirmModalOverlay}
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={[
              styles.confirmModalContent,
              danger ? styles.confirmModalContentDanger : '',
            ].join(' ').trim()}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmModalTitle"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div id="confirmModalTitle" className={styles.confirmModalTitle}>
              {title}
            </div>

            <div className={styles.confirmModalMessage}>
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>

            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={`${buttonStyles.button} ${buttonStyles.secondary} ${styles.button}`}
                onClick={onCancel}
              >
                {cancelText}
              </button>

              <button
                type="button"
                className={[
                  buttonStyles.button,
                  styles.button,
                  danger
                    ? buttonStyles.danger
                    : buttonStyles.primary,
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
