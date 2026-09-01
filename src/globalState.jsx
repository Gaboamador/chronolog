import Context from "@/context";

import { useAuth } from "@/hooks/useAuth";
import { useEntries } from "@/hooks/useEntries";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import { useDefaultWorkTime } from "@/hooks/useDefaultWorkTime";

function GlobalState(props) {
  const {
    user,
    setUser,
    authLoading,
    logout: authLogout,
  } = useAuth();

  const {
    selectedDate,
    setSelectedDate,
  } = useSelectedDate();

  const {
    defaultWorkTime,
    setDefaultWorkTime,

    necesitaConfigurarHorario,
    setNecesitaConfigurarHorario,

    mostrarModalHorario,
    setMostrarModalHorario,

    defaultWorkTimeLoading,
    defaultWorkTimeError,

    clearDefaultWorkTimeLocalState,
  } = useDefaultWorkTime(user, authLoading);

  const {
    entries,
    entriesLoading,
    entriesError,
    persistEntry,
    removeEntry,
    persistEntries,
    exportAllEntries,
    fetchEntriesInRange,
    restoreAllEntries,
    clearAllEntries,
    legacyPendingCount,
    legacyUnassignedCount,
    legacyMigrationChecked,
    inspectLegacyPendingEntries,
    importLegacyPendingEntries,
    exportUnassignedLegacyEntries,
    inspectUnassignedLegacyEntries,
    importUnassignedLegacyEntries,
    syncStatus,
    hasPendingWrites,
  } = useEntries(user, authLoading, selectedDate);

  const loading = authLoading;

  const logout = async () => {
    try {
      await authLogout();

      setUser(null);

      clearDefaultWorkTimeLocalState();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  return (
    <Context.Provider
      value={{
        selectedDate,
        setSelectedDate,

        entries,
        persistEntry,
        removeEntry,
        persistEntries,
        exportAllEntries,
        fetchEntriesInRange,
        restoreAllEntries,
        clearAllEntries,
        legacyPendingCount,
        legacyUnassignedCount,
        legacyMigrationChecked,
        inspectLegacyPendingEntries,
        importLegacyPendingEntries,
        exportUnassignedLegacyEntries,
        inspectUnassignedLegacyEntries,
        importUnassignedLegacyEntries,
        syncStatus,
        hasPendingWrites,

        user,
        setUser,
        logout,
        loading,

        entriesLoading,
        defaultWorkTimeLoading,

        defaultWorkTime,
        setDefaultWorkTime,

        necesitaConfigurarHorario,
        setNecesitaConfigurarHorario,

        mostrarModalHorario,
        setMostrarModalHorario,

        entriesUploadError:
          entriesError ||
          defaultWorkTimeError,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

export default GlobalState;
