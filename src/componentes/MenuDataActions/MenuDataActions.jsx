import React, { useContext, useRef, useState } from 'react';
import Context from '@/context';
import ConfirmModal from '@/componentes/ConfirmModal';
import { LuDownload, LuUpload, LuTrash2 } from 'react-icons/lu';
import { validateAndNormalizeBackup } from '@/utils/entries/backupValidation';
import headerStyles from '@/componentes/Header/Header.module.scss';

const MenuDataActions = ({ onActionComplete }) => {
  const context = useContext(Context);
  const fileInputRef = useRef(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [busy, setBusy] = useState(false);
  const closeMenu = () => onActionComplete?.();

  const handleDownloadBackup = async () => {
    try {
      setBusy(true);
      const entries = await context.exportAllEntries();
      const now = new Date();
      const pad = (value) => String(value).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chronolog_backup_${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
      closeMenu();
    } catch (error) {
      console.error('Error descargando backup:', error);
      alert('No se pudo generar el backup completo.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        setPendingRestore(validateAndNormalizeBackup(JSON.parse(loadEvent.target.result)));
      } catch (error) {
        alert(error.message || 'El archivo no tiene el formato correcto.');
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => alert('Error al leer el archivo.');
    reader.readAsText(file);
  };

  const confirmRestore = async () => {
    try {
      setBusy(true);
      await context.restoreAllEntries(pendingRestore);
      setPendingRestore(null);
      alert('Backup restaurado correctamente.');
      closeMenu();
    } catch (error) {
      console.error('Error restaurando backup:', error);
      alert('La restauración no pudo completarse. Revisá la conexión antes de reintentar.');
    } finally {
      setBusy(false);
    }
  };

  const confirmClear = async () => {
    try {
      setBusy(true);
      await context.clearAllEntries();
      setConfirmClearOpen(false);
      closeMenu();
    } catch (error) {
      console.error('Error borrando registros:', error);
      alert('No se pudieron borrar todos los registros.');
    } finally {
      setBusy(false);
    }
  };

  const importLegacy = async () => {
    try {
      const preview = await context.inspectLegacyPendingEntries();
      const accepted = window.confirm(
        `Se encontraron ${preview.pending} registros pendientes de la versión anterior. ` +
        (preview.conflicts
          ? `${preview.conflicts} fechas tienen una versión remota diferente y serán reemplazadas. `
          : 'No se detectaron versiones remotas diferentes. ') +
        '¿Querés importarlos en esta cuenta?'
      );
      if (!accepted) return;
      const result = await context.importLegacyPendingEntries();
      alert(`Se importaron ${result.imported} registros heredados${result.conflicts ? ` (${result.conflicts} reemplazaron una versión remota distinta)` : ''}.`);
    } catch (error) {
      console.error('Error importando datos heredados:', error);
      alert('No se pudieron importar los cambios heredados.');
    }
  };

  const downloadUnassignedLegacy = () => {
    const entries = context.exportUnassignedLegacyEntries();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chronolog_cambios_anteriores_sin_asignar.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <li onClick={busy ? undefined : handleDownloadBackup}>
        <LuDownload className={headerStyles.settingsIcon} /> Descargar backup
      </li>
      <li onClick={() => !busy && fileInputRef.current?.click()}>
        <LuUpload className={headerStyles.settingsIcon} /> Restaurar backup
      </li>
      {context.legacyPendingCount > 0 && (
        <li onClick={importLegacy}>
          <LuUpload className={headerStyles.settingsIcon} /> Importar cambios anteriores
        </li>
      )}
      {context.legacyUnassignedCount > 0 && (
        <li onClick={downloadUnassignedLegacy}>
          <LuDownload className={headerStyles.settingsIcon} /> Descargar cambios sin asociar
        </li>
      )}
      <li className={`${headerStyles.bottomDivider} ${headerStyles.danger}`} onClick={() => setConfirmClearOpen(true)}>
        <LuTrash2 className={headerStyles.settingsIcon} /> Borrar registros
      </li>
      <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleRestoreBackup} />
      <ConfirmModal
        isOpen={Boolean(pendingRestore)}
        title="Restaurar backup"
        message={`El backup contiene ${pendingRestore?.length || 0} registros. Al confirmar reemplazará todo el historial actual; los registros que no estén en el archivo serán eliminados.`}
        confirmText="Restaurar"
        cancelText="Cancelar"
        danger
        onConfirm={confirmRestore}
        onCancel={() => setPendingRestore(null)}
      />
      <ConfirmModal
        isOpen={confirmClearOpen}
        title="Borrar registros"
        message="¿Estás seguro de que querés borrar todos los registros de Firestore? Esta acción se propagará a los demás dispositivos."
        confirmText="Borrar"
        cancelText="Cancelar"
        danger
        onConfirm={confirmClear}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </>
  );
};

export default MenuDataActions;
