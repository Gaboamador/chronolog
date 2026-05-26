import React, { useContext, useRef } from 'react';
import Context from '../context';
import '../estilos/Header.scss';
import { LuDownload, LuUpload, LuTrash2 } from "react-icons/lu";

const MenuDataActions = ({ onActionComplete }) => {
  const context = useContext(Context);
  const fileInputRef = useRef(null);

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
    if (
      window.confirm(
        '¿Estás seguro que querés borrar todos los registros? Esta acción no se puede deshacer.'
      )
    ) {
      context.setEntries([]);
      localStorage.removeItem('timeEntries');
      closeMenu();
    }
  };

  return (
    <>
      <li
        className="divider-above"
        onClick={handleDownloadBackup}>
        <LuDownload className="settings-icon" />
        Descargar backup
      </li>

      <li onClick={handleRestoreBackupClick}>
        <LuUpload className="settings-icon" />
        Restaurar backup
      </li>

      <li
        className="bottom-divider danger"
        onClick={handleClearEntries}>
        <LuTrash2 className="settings-icon" />
        Borrar registros
      </li>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleRestoreBackup}
      />
    </>
  );
};

export default MenuDataActions;