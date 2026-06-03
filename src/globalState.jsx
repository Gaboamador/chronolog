import Context from "./context";

import { useAuth } from "./hooks/useAuth";
import { useEntries } from "./hooks/useEntries";
import { useSelectedDate } from "./hooks/useSelectedDate";
import { useDefaultWorkTime } from "./hooks/useDefaultWorkTime";

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
    setEntries,

    entriesLoading,
    entriesError,

    uploadEntriesToFirebase,
    isUploadingEntries,
    entriesUploadError,

    hasPendingEntriesChanges,

    clearEntriesLocalState,
  } = useEntries(user, authLoading);

  const loading = authLoading;

  const logout = async () => {
    try {
      await authLogout();

      setUser(null);

      clearEntriesLocalState();
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
        setEntries,

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

        uploadEntriesToFirebase,
        isUploadingEntries,

        entriesUploadError:
          entriesUploadError ||
          entriesError ||
          defaultWorkTimeError,

        hasPendingEntriesChanges,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

export default GlobalState;