import React, { useContext, useRef, useState } from 'react';
import Context from '@/context';
import ConfirmModal from '@/componentes/ConfirmModal';
import { LuDownload, LuUpload, LuTrash2 } from "react-icons/lu";
import headerStyles from '@/componentes/Header/Header.module.scss';

const MenuDataActions = ({ onActionComplete }) => {
  const context = useContext(Context);
  const fileInputRef = useRef(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const closeMenu = () => {
    if (typeof onActionComplete === 'function') {
      onActionComplete();
    }
  };

  const handleDownloadBackup = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `chronolog_backup_${timestamp}.json`;

    const dataStr = JSON.stringify(context.entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    closeMenu();
  };

  const handleRestoreBackupClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRestoreBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        if (Array.isArray(importedData)) {
          context.setEntries(importedData);
          alert('Backup restaurado correctamente.');
          closeMenu();
        } else {
          alert('El archivo no tiene el formato correcto.');
        }
      } catch (error) {
        console.error('Error restoring backup:', error);
        alert('Error al leer el archivo.');
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleClearEntries = () => {
    setConfirmClearOpen(true);
  };
  const handleConfirmClearEntries = () => {
    context.setEntries([]);
    localStorage.removeItem('timeEntries');
    setConfirmClearOpen(false);
    closeMenu();
  };

  const handleCancelClearEntries = () => {
    setConfirmClearOpen(false);
  };

  return (
    <>
      <li
        onClick={handleDownloadBackup}>
        <LuDownload className={headerStyles.settingsIcon} />
        Descargar backup
      </li>

      <li onClick={handleRestoreBackupClick}>
        <LuUpload className={headerStyles.settingsIcon} />
        Restaurar backup
      </li>

      <li
        className={`${headerStyles.bottomDivider} ${headerStyles.danger}`}
        onClick={handleClearEntries}>
        <LuTrash2 className={headerStyles.settingsIcon} />
        Borrar registros
      </li>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleRestoreBackup}
      />
      <ConfirmModal
        isOpen={confirmClearOpen}
        title="Borrar registros"
        message="¿Estás seguro de que querés borrar todos los registros? El cambio quedará pendiente hasta que cargues los cambios."
        confirmText="Borrar"
        cancelText="Cancelar"
        danger
        onConfirm={handleConfirmClearEntries}
        onCancel={handleCancelClearEntries}
      />
    </>
  );
};

export default MenuDataActions;
