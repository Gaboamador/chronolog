import { sortEntriesByDate } from './sortEntriesByDate.js';

export const MONTH_CACHE_PREFIX = 'chronolog:entries-cache:v2';
export const monthKeyOf = (value) => typeof value === 'string'
  ? value.slice(0, 7)
  : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
export const monthCacheKey = (uid, monthKey) => `${MONTH_CACHE_PREFIX}:${uid}:${monthKey}`;

export function readMonthCache(uid, monthKey, storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(monthCacheKey(uid, monthKey)) || 'null');
    return Array.isArray(value?.entries) ? sortEntriesByDate(value.entries) : [];
  } catch {
    return [];
  }
}

export function writeMonthCache(uid, monthKey, entries, storage = localStorage) {
  if (!uid || !monthKey) return;
  try {
    storage.setItem(monthCacheKey(uid, monthKey), JSON.stringify({
      version: 2, uid, monthKey, updatedAt: new Date().toISOString(),
      entries: sortEntriesByDate(entries.filter((entry) => entry.date?.startsWith(`${monthKey}-`))),
    }));
  } catch (error) {
    console.warn('No se pudo actualizar el cache mensual.', error);
  }
}

export function readAllMonthCaches(uid, storage = localStorage) {
  if (!uid) return [];
  const prefix = `${MONTH_CACHE_PREFIX}:${uid}:`;
  const entries = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) entries.push(...readMonthCache(uid, key.slice(prefix.length), storage));
  }
  return sortEntriesByDate(entries);
}

export function clearMonthCaches(uid, storage = localStorage) {
  try {
    const prefix = `${MONTH_CACHE_PREFIX}:${uid}:`;
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn('No se pudieron limpiar los caches mensuales.', error);
  }
}
