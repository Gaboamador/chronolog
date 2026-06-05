import { useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  isSameMonth,
  isValid,
  parseISO,
} from "date-fns";

import { auth } from "@/firebase";

import {
  eliminarEntrada,
  guardarEntrada,
  obtenerEntradas,
} from "@/services/firebase/entriesService";

import { sortEntriesByDate } from "@/utils/entries/sortEntriesByDate";
import { getChangedEntryDates } from "@/utils/entries/getChangedEntryDates";
import { buildEntryPayloadForDate } from "@/utils/entries/buildEntryPayloadForDate";

const LOCAL_ENTRIES_STORAGE_KEY = "timeEntries";
const PENDING_ENTRIES_STORAGE_KEY = "pendingTimeEntries";
const CURRENT_MONTH_ENTRIES_STORAGE_KEY = "currentMonthTimeEntries";
const MAX_CHANGED_DATES_PER_UPLOAD = 40;

function getCurrentMonthKey() {
  return format(new Date(), "yyyy-MM");
}

function getCurrentMonthEntriesStorageKey(uid) {
  return `${CURRENT_MONTH_ENTRIES_STORAGE_KEY}:${uid}`;
}

function getLocalEntries() {
  const local = localStorage.getItem(LOCAL_ENTRIES_STORAGE_KEY);
  return local ? sortEntriesByDate(JSON.parse(local)) : [];
}

function getPendingEntries() {
  const pendingEntriesData = localStorage.getItem(PENDING_ENTRIES_STORAGE_KEY);

  return pendingEntriesData
    ? sortEntriesByDate(JSON.parse(pendingEntriesData))
    : null;
}

/**
 * Esta función depende del shape real de cada entrada.
 * Si tus entradas usan otro campo de fecha, ajustalo acá.
 */
function getEntryDateValue(entry) {
  return entry?.date || entry?.fecha || null;
}

function parseEntryDate(entry) {
  const rawDate = getEntryDateValue(entry);

  if (!rawDate) return null;

  if (rawDate instanceof Date) {
    return isValid(rawDate) ? rawDate : null;
  }

  if (typeof rawDate === "string") {
    const parsedDate = parseISO(rawDate);
    return isValid(parsedDate) ? parsedDate : null;
  }

  return null;
}

function isEntryFromCurrentMonth(entry) {
  const entryDate = parseEntryDate(entry);

  if (!entryDate) return false;

  return isSameMonth(entryDate, new Date());
}

function getCurrentMonthEntries(entries) {
  return sortEntriesByDate(entries.filter(isEntryFromCurrentMonth));
}

function getCachedCurrentMonthEntries(uid) {
  if (!uid) return [];

  const cachedData = localStorage.getItem(
    getCurrentMonthEntriesStorageKey(uid)
  );

  if (!cachedData) return [];

  const parsedData = JSON.parse(cachedData);

  if (parsedData?.monthKey !== getCurrentMonthKey()) {
    return [];
  }

  return parsedData?.entries
    ? sortEntriesByDate(parsedData.entries)
    : [];
}

function saveCachedCurrentMonthEntries(uid, entries) {
  if (!uid) return;

  const currentMonthEntries = getCurrentMonthEntries(entries);

  localStorage.setItem(
    getCurrentMonthEntriesStorageKey(uid),
    JSON.stringify({
      monthKey: getCurrentMonthKey(),
      entries: currentMonthEntries,
    })
  );
}

function removeCachedCurrentMonthEntries(uid) {
  if (!uid) return;

  localStorage.removeItem(getCurrentMonthEntriesStorageKey(uid));
}

function mergeCurrentMonthEntries(baseEntries, currentMonthSourceEntries) {
  const baseEntriesWithoutCurrentMonth = baseEntries.filter(
    (entry) => !isEntryFromCurrentMonth(entry)
  );

  const currentMonthEntries = getCurrentMonthEntries(currentMonthSourceEntries);

  return sortEntriesByDate([
    ...baseEntriesWithoutCurrentMonth,
    ...currentMonthEntries,
  ]);
}

export function useEntries(user, authLoading) {
  const [entries, setEntriesInternal] = useState(getLocalEntries);

  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesHydrated, setEntriesHydrated] = useState(false);
  const [entriesError, setEntriesError] = useState(null);

  const [isUploadingEntries, setIsUploadingEntries] = useState(false);
  const [entriesUploadError, setEntriesUploadError] = useState(null);

  const prevEntriesRef = useRef(entries);
  const latestEntriesRef = useRef(entries);
  const hasUserEditedEntriesRef = useRef(false);

  const [confirmedEntriesSignature, setConfirmedEntriesSignature] = useState(
    JSON.stringify(entries)
  );

  const hasPendingEntriesChanges = useMemo(() => {
    if (!entriesHydrated) return false;

    const fechasModificadas = getChangedEntryDates(
      prevEntriesRef.current,
      entries
    );

    const payloadsByDate = fechasModificadas.map((fecha) =>
      buildEntryPayloadForDate(entries, fecha)
    );

    const payloadsToSave = payloadsByDate.filter(
      (payload) => payload.entries.length > 0
    );

    const datesToDelete = payloadsByDate
      .filter((payload) => payload.entries.length === 0)
      .map((payload) => payload.date);

    return payloadsToSave.length > 0 || datesToDelete.length > 0;
  }, [entries, entriesHydrated, confirmedEntriesSignature]);

  const setEntries = (newEntriesOrUpdater) => {
    hasUserEditedEntriesRef.current = true;

    setEntriesInternal((prevEntries) => {
      const newEntries =
        typeof newEntriesOrUpdater === "function"
          ? newEntriesOrUpdater(prevEntries)
          : newEntriesOrUpdater;

      const sortedEntries = sortEntriesByDate(newEntries);

      latestEntriesRef.current = sortedEntries;

      return sortedEntries;
    });
  };

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function loadEntries() {
      setEntriesLoading(true);
      setEntriesHydrated(false);
      setEntriesError(null);
      hasUserEditedEntriesRef.current = false;

      try {
        if (!user) {
          const localEntries = getLocalEntries();

          if (cancelled) return;

          setEntriesInternal(localEntries);
          latestEntriesRef.current = localEntries;
          prevEntriesRef.current = localEntries;

          setConfirmedEntriesSignature(JSON.stringify(localEntries));
          setEntriesUploadError(null);
          setEntriesLoading(false);

          return;
        }

        const cachedCurrentMonthEntries = getCachedCurrentMonthEntries(user.uid);

        setEntriesInternal(cachedCurrentMonthEntries);
        latestEntriesRef.current = cachedCurrentMonthEntries;
        setEntriesLoading(false);

        const pendingEntries = getPendingEntries();

        const firestoreEntries = sortEntriesByDate(
          await obtenerEntradas(user.uid)
        );

        if (cancelled) return;

        prevEntriesRef.current = firestoreEntries;
        setConfirmedEntriesSignature(JSON.stringify(firestoreEntries));

        const baseEntries =
          pendingEntries && pendingEntries.length > 0
            ? pendingEntries
            : firestoreEntries;

        const entriesToShow = hasUserEditedEntriesRef.current
          ? mergeCurrentMonthEntries(baseEntries, latestEntriesRef.current)
          : baseEntries;

        setEntriesInternal(entriesToShow);
        latestEntriesRef.current = entriesToShow;

        saveCachedCurrentMonthEntries(user.uid, entriesToShow);

        setEntriesUploadError(null);
      } catch (error) {
        if (cancelled) return;

        console.error("Error cargando entradas:", error);

        setEntriesError(error);
        setEntriesUploadError(error);

        if (!user) {
          const localEntries = getLocalEntries();

          setEntriesInternal(localEntries);
          latestEntriesRef.current = localEntries;
          prevEntriesRef.current = localEntries;

          setConfirmedEntriesSignature(JSON.stringify(localEntries));
        }
      } finally {
        if (!cancelled) {
          setEntriesLoading(false);
          setEntriesHydrated(true);
        }
      }
    }

    loadEntries();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    if (!entriesHydrated && !hasUserEditedEntriesRef.current) return;

    saveCachedCurrentMonthEntries(user.uid, entries);
  }, [
    entries,
    authLoading,
    user,
    entriesHydrated,
  ]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!entriesHydrated) return;

    if (hasPendingEntriesChanges) {
      localStorage.setItem(
        PENDING_ENTRIES_STORAGE_KEY,
        JSON.stringify(entries)
      );
    } else {
      localStorage.removeItem(PENDING_ENTRIES_STORAGE_KEY);
    }
  }, [
    entries,
    hasPendingEntriesChanges,
    authLoading,
    user,
    entriesHydrated,
  ]);

  const uploadEntriesToFirebase = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No hay usuario autenticado.");
    }

    const fechasModificadas = getChangedEntryDates(
      prevEntriesRef.current,
      entries
    );

    if (fechasModificadas.length > MAX_CHANGED_DATES_PER_UPLOAD) {
    throw new Error(
        `Carga bloqueada por seguridad: se detectaron ${fechasModificadas.length} fechas modificadas.`
    );
    }

    const payloadsByDate = fechasModificadas.map((fecha) =>
    buildEntryPayloadForDate(entries, fecha)
    );

    const payloadsToSave = payloadsByDate.filter(
    (payload) => payload.entries.length > 0
    );

    const datesToDelete = payloadsByDate
    .filter((payload) => payload.entries.length === 0)
    .map((payload) => payload.date);

    if (!payloadsToSave.length && !datesToDelete.length) {
    return {
        savedCount: 0,
        deletedCount: 0,
    };
    }

    setIsUploadingEntries(true);
    setEntriesUploadError(null);

    try {
        await Promise.all([
        ...payloadsToSave.map((payload) =>
            guardarEntrada(currentUser.uid, payload)
        ),
        ...datesToDelete.map((date) =>
            eliminarEntrada(currentUser.uid, date)
        ),
        ]);

      const confirmedEntries = sortEntriesByDate(entries);

      prevEntriesRef.current = confirmedEntries;
      latestEntriesRef.current = confirmedEntries;

      setConfirmedEntriesSignature(JSON.stringify(confirmedEntries));

      saveCachedCurrentMonthEntries(currentUser.uid, confirmedEntries);

      localStorage.removeItem(PENDING_ENTRIES_STORAGE_KEY);
      hasUserEditedEntriesRef.current = false;

      return {
        savedCount: payloadsToSave.length,
        deletedCount: datesToDelete.length,
      };
    } catch (error) {
      console.error("Error cargando entradas a Firebase:", error);
      setEntriesUploadError(error);
      throw error;
    } finally {
      setIsUploadingEntries(false);
    }
  };

  const clearEntriesLocalState = () => {
    const currentUid = user?.uid || auth.currentUser?.uid;

    setEntriesInternal([]);

    prevEntriesRef.current = [];
    latestEntriesRef.current = [];
    hasUserEditedEntriesRef.current = false;

    setConfirmedEntriesSignature(JSON.stringify([]));
    setEntriesError(null);
    setEntriesUploadError(null);
    setEntriesHydrated(false);

    localStorage.removeItem(LOCAL_ENTRIES_STORAGE_KEY);
    localStorage.removeItem(PENDING_ENTRIES_STORAGE_KEY);

    removeCachedCurrentMonthEntries(currentUid);
  };

  return {
    entries,
    setEntries,

    entriesLoading,
    entriesError,

    uploadEntriesToFirebase,
    isUploadingEntries,
    entriesUploadError,

    hasPendingEntriesChanges,

    clearEntriesLocalState,
  };
}
