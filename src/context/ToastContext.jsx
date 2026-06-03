import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ToastContext.module.scss';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (arg1, arg2 = 'info', options = {}) => {
      const normalized =
        typeof arg1 === 'object'
          ? {
              message: arg1.message,
              type: arg1.type || 'info',
              duration: arg1.duration,
            }
          : {
              message: arg1,
              type: arg2 || 'info',
              duration: options.duration,
            };

      if (!normalized.message) return;

      const id = ++idCounter;
      const duration = normalized.duration ?? 3000;

      setToasts((prev) => [
        ...prev,
        {
          id,
          message: normalized.message,
          type: normalized.type,
        },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const toastUI = (
    <div className={styles.container} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            styles.toast,
            toast.type === 'success'
              ? styles.success
              : toast.type === 'error'
              ? styles.error
              : toast.type === 'warning'
              ? styles.warning
              : styles.info,
          ].join(' ')}
          role="status"
        >
          <div className={styles.indicator} />

          <div className={styles.content}>
            <span className={styles.message}>{toast.message}</span>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(toastUI, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }

  return context;
}