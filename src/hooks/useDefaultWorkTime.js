import { useEffect, useState } from "react";
import { obtenerHorarioPorDefecto } from "@/services/firebase/userSettingsService";

const DEFAULT_WORK_TIME = {
  defaultPersonalStartTime: "09:00",
  defaultPersonalEndTime: "17:00",
};

export function useDefaultWorkTime(user, authLoading) {
  const [defaultWorkTime, setDefaultWorkTime] = useState(DEFAULT_WORK_TIME);

  const [necesitaConfigurarHorario, setNecesitaConfigurarHorario] =
    useState(false);

  const [mostrarModalHorario, setMostrarModalHorario] = useState(false);

  const [defaultWorkTimeLoading, setDefaultWorkTimeLoading] = useState(false);
  const [defaultWorkTimeError, setDefaultWorkTimeError] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setDefaultWorkTime(DEFAULT_WORK_TIME);
      setNecesitaConfigurarHorario(false);
      setMostrarModalHorario(false);
      setDefaultWorkTimeError(null);
      return;
    }

    let cancelled = false;

    async function loadDefaultWorkTime() {
      setDefaultWorkTimeLoading(true);
      setDefaultWorkTimeError(null);

      try {
        const firestoreDefaults = await obtenerHorarioPorDefecto(user.uid);

        if (cancelled) return;

        if (firestoreDefaults) {
          setDefaultWorkTime(firestoreDefaults);
          setNecesitaConfigurarHorario(false);
          setMostrarModalHorario(false);
        } else {
          setDefaultWorkTime(DEFAULT_WORK_TIME);
          setNecesitaConfigurarHorario(true);
          setMostrarModalHorario(true);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Error cargando horario por defecto:", error);
        setDefaultWorkTimeError(error);
      } finally {
        if (!cancelled) {
          setDefaultWorkTimeLoading(false);
        }
      }
    }

    loadDefaultWorkTime();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const clearDefaultWorkTimeLocalState = () => {
    setDefaultWorkTime(DEFAULT_WORK_TIME);
    setNecesitaConfigurarHorario(false);
    setMostrarModalHorario(false);
    setDefaultWorkTimeError(null);

    localStorage.removeItem("defaultPersonalWorkTime");
  };

  return {
    defaultWorkTime,
    setDefaultWorkTime,

    necesitaConfigurarHorario,
    setNecesitaConfigurarHorario,

    mostrarModalHorario,
    setMostrarModalHorario,

    defaultWorkTimeLoading,
    defaultWorkTimeError,

    clearDefaultWorkTimeLocalState,
  };
}
