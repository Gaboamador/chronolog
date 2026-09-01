import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import {
  deleteAllEntries, deleteEntry, getAllEntries, getEntriesInRange, replaceAllEntries,
  saveEntriesBatch, saveEntriesInChunks, saveEntry, subscribeToMonthEntries,
} from '@/services/firebase/entriesService';
import { sortEntriesByDate } from '@/utils/entries/sortEntriesByDate';
import {
  clearMonthCaches, monthKeyOf, readAllMonthCaches, readMonthCache, writeMonthCache,
} from '@/utils/entries/monthCache';
import {
  archiveUnassignedLegacyEntries, clearMigratedLegacyEntries, getLegacyMigrationState,
  readLegacyCandidates, readUidLegacyEntries,
} from '@/utils/entries/legacyMigration';

function replaceMonth(allEntries, monthKey, monthEntries) {
  return sortEntriesByDate([
    ...allEntries.filter((entry) => monthKeyOf(entry.date) !== monthKey),
    ...monthEntries,
  ]);
}

function upsertMany(allEntries, nextEntries) {
  const dates = new Set(nextEntries.map((entry) => entry.date));
  return sortEntriesByDate([
    ...allEntries.filter((entry) => !dates.has(entry.date)),
    ...nextEntries,
  ]);
}

function migrateUidScopedLegacyCache(uid) {
  const entries = readUidLegacyEntries(uid);
  entries.forEach((entry) => writeMonthCache(uid, monthKeyOf(entry.date), entries));
  return entries;
}

export function useEntries(user, authLoading, selectedDate) {
  const monthKey = selectedDate ? format(selectedDate, 'yyyy-MM') : format(new Date(), 'yyyy-MM');
  const subscribedMonths = useMemo(() => {
    if (!selectedDate) return [monthKey];
    return Array.from(new Set([
      monthKey,
      format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM'),
      format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM'),
    ]));
  }, [monthKey, selectedDate]);
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [snapshotFromCache, setSnapshotFromCache] = useState(false);
  const [legacyPendingCount, setLegacyPendingCount] = useState(0);
  const [legacyUnassignedCount, setLegacyUnassignedCount] = useState(0);
  const [legacyMigrationCheckedUid, setLegacyMigrationCheckedUid] = useState(null);
  const mutationCountRef = useRef(0);
  const activeUidRef = useRef(null);
  const monthMetadataRef = useRef(new Map());

  const cacheEntries = useCallback((uid, nextEntries, affectedMonths = []) => {
    const months = new Set([
      ...nextEntries.map((entry) => monthKeyOf(entry.date)),
      ...affectedMonths,
    ]);
    months.forEach((month) => writeMonthCache(uid, month, nextEntries));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    activeUidRef.current = user?.uid || null;
    mutationCountRef.current = 0;
    monthMetadataRef.current.clear();
    setEntriesError(null);
    setHasPendingWrites(false);
    const legacyState = user ? getLegacyMigrationState(user.uid) : null;
    setLegacyPendingCount(legacyState?.ownedEntries.length || 0);
    setLegacyUnassignedCount(legacyState?.unassignedEntries.length || 0);
    setLegacyMigrationCheckedUid(user?.uid || null);
    if (!user) {
      setEntries([]);
      return;
    }
    const legacyCache = migrateUidScopedLegacyCache(user.uid);
    setEntries(upsertMany(readAllMonthCaches(user.uid), legacyCache));
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return undefined;
    setEntriesLoading(true);
    monthMetadataRef.current = new Map();
    subscribedMonths.forEach((subscribedMonth) => {
      const cached = readMonthCache(user.uid, subscribedMonth);
      if (cached.length) setEntries((current) => replaceMonth(current, subscribedMonth, cached));
    });

    const unsubscribes = subscribedMonths.map((subscribedMonth) =>
      subscribeToMonthEntries(user.uid, subscribedMonth, (snapshot) => {
        if (activeUidRef.current !== user.uid) return;
        const localCached = readMonthCache(user.uid, subscribedMonth);
        const preserveLocalCache =
          snapshot.fromCache &&
          !snapshot.hasPendingWrites &&
          snapshot.entries.length === 0 &&
          localCached.length > 0;
        if (!preserveLocalCache) {
          setEntries((current) => {
            const next = replaceMonth(current, subscribedMonth, snapshot.entries);
            writeMonthCache(user.uid, subscribedMonth, next);
            return next;
          });
        }
        monthMetadataRef.current.set(subscribedMonth, snapshot);
        const metadata = Array.from(monthMetadataRef.current.values());
        setHasPendingWrites(
          mutationCountRef.current > 0 || metadata.some((item) => item.hasPendingWrites)
        );
        setSnapshotFromCache(metadata.some((item) => item.fromCache));
        if (monthMetadataRef.current.size >= subscribedMonths.length) {
          setEntriesLoading(false);
        }
        setEntriesError(null);
      }, (error) => {
        console.error('Error sincronizando entradas:', error);
        setEntriesError(error);
        setEntriesLoading(false);
      })
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [authLoading, user, subscribedMonths]);

  const runMutation = useCallback((optimisticUpdate, operation, affectedMonths = []) => {
    if (!user) return Promise.reject(new Error('No hay usuario autenticado.'));
    const uid = user.uid;
    setEntries((current) => {
      const next = optimisticUpdate(current);
      cacheEntries(uid, next, affectedMonths);
      return next;
    });
    mutationCountRef.current += 1;
    setHasPendingWrites(true);
    setEntriesError(null);
    const promise = operation(uid).then(() => true).catch(async (error) => {
      if (activeUidRef.current !== uid) return false;
      console.error('Error persistiendo entradas:', error);
      setEntriesError(error);
      try {
        const authoritativeMonths = await Promise.all(affectedMonths.map(async (affectedMonth) => {
          const [year, month] = affectedMonth.split('-').map(Number);
          const lastDay = new Date(year, month, 0).getDate();
          const monthEntries = await getEntriesInRange(
            uid,
            `${affectedMonth}-01`,
            `${affectedMonth}-${String(lastDay).padStart(2, '0')}`
          );
          return { affectedMonth, monthEntries };
        }));
        if (activeUidRef.current !== uid) return false;
        setEntries((current) => {
          const next = authoritativeMonths.reduce(
            (result, item) => replaceMonth(result, item.affectedMonth, item.monthEntries),
            current
          );
          cacheEntries(uid, next, affectedMonths);
          return next;
        });
      } catch (reconcileError) {
        console.error('No se pudo reconciliar el estado rechazado:', reconcileError);
      }
      return false;
    }).finally(() => {
      if (activeUidRef.current !== uid) return;
      mutationCountRef.current -= 1;
      if (mutationCountRef.current === 0) {
        setHasPendingWrites(
          Array.from(monthMetadataRef.current.values()).some((item) => item.hasPendingWrites)
        );
      }
    });
    return promise;
  }, [user, cacheEntries]);

  const persistEntry = useCallback((entry) => runMutation(
    (current) => upsertMany(current, [entry]),
    (uid) => saveEntry(uid, entry),
    [monthKeyOf(entry.date)]
  ), [runMutation]);

  const removeEntry = useCallback((date) => runMutation(
    (current) => current.filter((entry) => entry.date !== date),
    (uid) => deleteEntry(uid, date),
    [monthKeyOf(date)]
  ), [runMutation]);

  const persistEntries = useCallback((nextEntries) => runMutation(
    (current) => upsertMany(current, nextEntries),
    (uid) => saveEntriesBatch(uid, nextEntries),
    Array.from(new Set(nextEntries.map((entry) => monthKeyOf(entry.date))))
  ), [runMutation]);

  const exportAllEntries = useCallback(() => {
    if (!user) throw new Error('No hay usuario autenticado.');
    return getAllEntries(user.uid);
  }, [user]);

  const fetchEntriesInRange = useCallback((startDate, endDate) => {
    if (!user) throw new Error('No hay usuario autenticado.');
    return getEntriesInRange(user.uid, startDate, endDate);
  }, [user]);

  const restoreAllEntries = useCallback(async (nextEntries) => {
    if (!user) throw new Error('No hay usuario autenticado.');
    const current = await getAllEntries(user.uid);
    await replaceAllEntries(user.uid, nextEntries, current);
    if (activeUidRef.current !== user.uid) return { previousCount: current.length, nextCount: nextEntries.length };
    clearMonthCaches(user.uid);
    cacheEntries(user.uid, nextEntries);
    setEntries(sortEntriesByDate(nextEntries));
    return { previousCount: current.length, nextCount: nextEntries.length };
  }, [user, cacheEntries]);

  const clearAllEntries = useCallback(async () => {
    if (!user) throw new Error('No hay usuario autenticado.');
    const current = await getAllEntries(user.uid);
    const deleted = await deleteAllEntries(user.uid, current);
    if (activeUidRef.current !== user.uid) return deleted;
    clearMonthCaches(user.uid);
    setEntries([]);
    return deleted;
  }, [user]);

  const inspectLegacyPendingEntries = useCallback(async () => {
    if (!user) throw new Error('No hay usuario autenticado.');
    const pending = readLegacyCandidates(user.uid);
    if (!pending.length) return { imported: 0, conflicts: 0 };
    const remote = await getAllEntries(user.uid);
    const remoteByDate = new Map(remote.map((entry) => [entry.date, entry]));
    const conflicts = pending.filter((entry) => {
      const existing = remoteByDate.get(entry.date);
      return existing && JSON.stringify(existing) !== JSON.stringify(entry);
    }).length;
    return { pending: pending.length, conflicts };
  }, [user]);

  const exportUnassignedLegacyEntries = useCallback(() => {
    if (!user) return [];
    return getLegacyMigrationState(user.uid).unassignedEntries;
  }, [user]);

  const inspectUnassignedLegacyEntries = useCallback(async () => {
    if (!user) throw new Error('No hay usuario autenticado.');
    const pending = getLegacyMigrationState(user.uid).unassignedEntries;
    if (!pending.length) return { pending: 0, conflicts: 0 };
    const remote = await getAllEntries(user.uid);
    const remoteByDate = new Map(remote.map((entry) => [entry.date, entry]));
    const conflicts = pending.filter((entry) => {
      const existing = remoteByDate.get(entry.date);
      return existing && JSON.stringify(existing) !== JSON.stringify(entry);
    }).length;
    return { pending: pending.length, conflicts };
  }, [user]);

  const importUnassignedLegacyEntries = useCallback(async () => {
    if (!user) throw new Error('No hay usuario autenticado.');
    const pending = getLegacyMigrationState(user.uid).unassignedEntries;
    if (!pending.length) return { imported: 0, conflicts: 0 };
    const remote = await getAllEntries(user.uid);
    const remoteByDate = new Map(remote.map((entry) => [entry.date, entry]));
    const conflicts = pending.filter((entry) => {
      const existing = remoteByDate.get(entry.date);
      return existing && JSON.stringify(existing) !== JSON.stringify(entry);
    }).length;
    await saveEntriesInChunks(user.uid, pending);
    // Conserva una copia local fechada antes de retirar las keys heredadas activas.
    archiveUnassignedLegacyEntries();
    if (activeUidRef.current !== user.uid) return { imported: pending.length, conflicts };
    setLegacyUnassignedCount(0);
    const merged = upsertMany(remote, pending);
    setEntries(merged);
    cacheEntries(user.uid, merged);
    return { imported: pending.length, conflicts };
  }, [user, cacheEntries]);

  const importLegacyPendingEntries = useCallback(async () => {
    if (!user) throw new Error('No hay usuario autenticado.');
    const pending = readLegacyCandidates(user.uid);
    if (!pending.length) return { imported: 0, conflicts: 0 };
    const remote = await getAllEntries(user.uid);
    const remoteByDate = new Map(remote.map((entry) => [entry.date, entry]));
    const conflicts = pending.filter((entry) => {
      const existing = remoteByDate.get(entry.date);
      return existing && JSON.stringify(existing) !== JSON.stringify(entry);
    }).length;
    await saveEntriesInChunks(user.uid, pending);
    if (activeUidRef.current !== user.uid) return { imported: pending.length, conflicts };
    clearMigratedLegacyEntries(user.uid);
    setLegacyPendingCount(0);
    const merged = upsertMany(remote, pending);
    setEntries(merged);
    cacheEntries(user.uid, merged);
    return { imported: pending.length, conflicts };
  }, [user, cacheEntries]);

  const syncStatus = legacyPendingCount > 0 || legacyUnassignedCount > 0
    ? 'migration'
    : entriesError
      ? 'error'
    : hasPendingWrites
      ? 'syncing'
      : snapshotFromCache
        ? 'offline'
        : 'synced';

  return {
    entries, entriesLoading, entriesError,
    persistEntry, removeEntry, persistEntries,
    exportAllEntries, fetchEntriesInRange, restoreAllEntries, clearAllEntries,
    legacyPendingCount, legacyUnassignedCount,
    legacyMigrationChecked: !user || legacyMigrationCheckedUid === user.uid,
    inspectLegacyPendingEntries, importLegacyPendingEntries, exportUnassignedLegacyEntries,
    inspectUnassignedLegacyEntries, importUnassignedLegacyEntries,
    syncStatus, hasPendingWrites,
  };
}
