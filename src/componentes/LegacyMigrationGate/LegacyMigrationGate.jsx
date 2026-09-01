import React, { useContext, useEffect, useState } from 'react';
import Context from '@/context';
import ConfirmModal from '@/componentes/ConfirmModal';
import buttonStyles from '@/styles/Botones.module.scss';
import styles from './LegacyMigrationGate.module.scss';

function downloadJson(entries) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'chronolog_datos_locales_anteriores.json';
  link.click();
  URL.revokeObjectURL(url);
}

export default function LegacyMigrationGate() {
  const context = useContext(Context);
  const [preview, setPreview] = useState(null);
  const [unassignedPreview, setUnassignedPreview] = useState(null);
  const [ownedInspecting, setOwnedInspecting] = useState(false);
  const [unassignedInspecting, setUnassignedInspecting] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [confirmUnassigned, setConfirmUnassigned] = useState(false);
  const [error, setError] = useState('');
  const busy = ownedInspecting || unassignedInspecting || mutationBusy;

  useEffect(() => {
    let active = true;
    if (!context.legacyPendingCount) {
      setPreview(null);
      return () => { active = false; };
    }
    setOwnedInspecting(true);
    setError('');
    context.inspectLegacyPendingEntries()
      .then((result) => { if (active) setPreview(result); })
      .catch(() => { if (active) setError('No se pudo comparar la información local con Firestore. Revisá la conexión y reintentá.'); })
      .finally(() => { if (active) setOwnedInspecting(false); });
    return () => { active = false; };
  }, [context.legacyPendingCount, context.inspectLegacyPendingEntries]);

  useEffect(() => {
    let active = true;
    if (!context.legacyUnassignedCount) {
      setUnassignedPreview(null);
      return () => { active = false; };
    }
    setUnassignedInspecting(true);
    setError('');
    context.inspectUnassignedLegacyEntries()
      .then((result) => { if (active) setUnassignedPreview(result); })
      .catch(() => { if (active) setError('No se pudieron comparar los datos sin asociar con Firestore. Revisá la conexión y reintentá.'); })
      .finally(() => { if (active) setUnassignedInspecting(false); });
    return () => { active = false; };
  }, [context.legacyUnassignedCount, context.inspectUnassignedLegacyEntries]);

  const migrate = async () => {
    try {
      setMutationBusy(true);
      setError('');
      await context.importLegacyPendingEntries();
    } catch (migrationError) {
      console.error('Error migrando datos locales anteriores:', migrationError);
      setError('La migración no terminó. Tus datos locales siguen intactos; revisá la conexión y reintentá.');
    } finally {
      setMutationBusy(false);
    }
  };

  const downloadBackup = () => {
    try {
      const entries = context.exportUnassignedLegacyEntries();
      downloadJson(entries);
    } catch (archiveError) {
      console.error('Error respaldando datos locales sin asociar:', archiveError);
      setError('No se pudo crear el respaldo. No se eliminó ningún dato local.');
    }
  };

  const migrateUnassigned = async () => {
    try {
      setMutationBusy(true);
      setError('');
      await context.importUnassignedLegacyEntries();
      setConfirmUnassigned(false);
    } catch (migrationError) {
      console.error('Error migrando datos locales sin UID:', migrationError);
      setError('La migración no terminó. Los datos locales siguen intactos; revisá la conexión y reintentá.');
    } finally {
      setMutationBusy(false);
    }
  };

  return (
    <main className={styles.wrapper} aria-live="polite">
      <section className={styles.card}>
        <span className={styles.eyebrow}>Actualización de datos</span>
        <h1>Protejamos tus registros anteriores</h1>

        {context.legacyPendingCount > 0 && (
          <>
            <p>
              Encontramos <strong>{context.legacyPendingCount} registros locales</strong>, incluyendo
              cualquier jornada abierta que todavía no se hubiera cargado. Antes de continuar los
              vamos a guardar en tu cuenta para incorporarlos a la sincronización automática.
            </p>
            {preview?.conflicts > 0 && (
              <p className={styles.warning}>
                {preview.conflicts} fechas también existen en Firestore con otros datos. La versión
                local se conservará porque representa los cambios que estaban pendientes de cargar.
              </p>
            )}
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.primary}`}
              disabled={busy || !preview}
              onClick={migrate}
            >
              {busy ? 'VERIFICANDO…' : 'MIGRAR DATOS Y CONTINUAR'}
            </button>
          </>
        )}

        {context.legacyUnassignedCount > 0 && (
          <div className={styles.unassigned}>
            <p>
              Además hay <strong>{context.legacyUnassignedCount} registros sin una cuenta identificable</strong>.
              Confirmá si pertenecen a la cuenta que está abierta. La importación combinará estos
              registros por fecha y no borrará otros días que ya existan en Firestore.
            </p>
            {unassignedPreview?.conflicts > 0 && (
              <p className={styles.warning}>
                {unassignedPreview.conflicts} fechas tienen datos diferentes en Firestore. Al migrar,
                la versión local pendiente reemplazará solamente esas fechas.
              </p>
            )}
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.primary}`}
              disabled={busy || !unassignedPreview}
              onClick={() => setConfirmUnassigned(true)}
            >
              {busy ? 'VERIFICANDO…' : 'MIGRAR A ESTA CUENTA'}
            </button>
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.secondary}`}
              disabled={busy}
              onClick={downloadBackup}
            >
              DESCARGAR RESPALDO
            </button>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.note}>No se habilitará el uso normal hasta resolver estos registros.</p>
        <button
          type="button"
          className={`${buttonStyles.button} ${buttonStyles.secondary}`}
          disabled={busy}
          onClick={context.logout}
        >
          CERRAR SESIÓN
        </button>
      </section>
      <ConfirmModal
        isOpen={confirmUnassigned}
        title="Migrar datos a esta cuenta"
        message={`Se incorporarán ${context.legacyUnassignedCount} registros a la cuenta abierta. ${unassignedPreview?.conflicts || 0} fechas reemplazarán datos remotos diferentes; los demás días de Firestore no se borrarán.`}
        confirmText="Migrar"
        cancelText="Cancelar"
        onConfirm={migrateUnassigned}
        onCancel={() => setConfirmUnassigned(false)}
      />
    </main>
  );
}
