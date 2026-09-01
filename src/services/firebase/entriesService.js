import { db } from '@/firebase';
import {
  collection, deleteDoc, doc, documentId, endAt, endBefore, getDoc, getDocs, onSnapshot,
  orderBy, query, setDoc, startAt, writeBatch,
} from 'firebase/firestore';
import { flattenFirestoreEntries } from '@/utils/entries/flattenFirestoreEntries';
import { buildDailyEntryPayload } from '@/utils/entries/normalizeEntryForPersistence';

const BATCH_LIMIT = 500;
const entryRef = (uid, date) => doc(db, 'users', uid, 'entries', date);
const entriesRef = (uid) => collection(db, 'users', uid, 'entries');

function assertUid(uid) {
  if (!uid) throw new Error('No hay usuario autenticado.');
}

function assertEntry(entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.date || '')) {
    throw new Error('La entrada no tiene una fecha válida.');
  }
}

function nextMonthKey(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey || '');
  if (!match) throw new Error('Mes inválido.');
  const next = new Date(Number(match[1]), Number(match[2]), 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

const payloadFor = buildDailyEntryPayload;

export function subscribeToMonthEntries(uid, monthKey, onData, onError) {
  assertUid(uid);
  const monthQuery = query(
    entriesRef(uid),
    orderBy(documentId()),
    startAt(`${monthKey}-01`),
    endBefore(`${nextMonthKey(monthKey)}-01`)
  );
  return onSnapshot(monthQuery, { includeMetadataChanges: true }, (snapshot) => {
    onData({
      entries: flattenFirestoreEntries(snapshot.docs.map((item) => item.data())),
      fromCache: snapshot.metadata.fromCache,
      hasPendingWrites: snapshot.metadata.hasPendingWrites,
    });
  }, onError);
}

export async function saveEntry(uid, entry) {
  assertUid(uid);
  assertEntry(entry);
  await setDoc(entryRef(uid, entry.date), payloadFor(entry));
}

export async function deleteEntry(uid, date) {
  assertUid(uid);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Fecha inválida.');
  await deleteDoc(entryRef(uid, date));
}

export async function getAllEntries(uid) {
  assertUid(uid);
  const snapshot = await getDocs(entriesRef(uid));
  return flattenFirestoreEntries(snapshot.docs.map((item) => item.data()));
}

export async function getEntryByDate(uid, date) {
  assertUid(uid);
  const snapshot = await getDoc(entryRef(uid, date));
  if (!snapshot.exists()) return null;
  return flattenFirestoreEntries([snapshot.data()])[0] || null;
}

export async function getEntriesInRange(uid, startDate, endDate) {
  assertUid(uid);
  const rangeQuery = query(
    entriesRef(uid),
    orderBy(documentId()),
    startAt(startDate),
    endAt(endDate)
  );
  const snapshot = await getDocs(rangeQuery);
  return flattenFirestoreEntries(snapshot.docs.map((item) => item.data()));
}

async function commitOperations(uid, operations) {
  if (operations.length > BATCH_LIMIT) {
    throw new Error(`La operación afecta ${operations.length} documentos y supera el límite seguro de ${BATCH_LIMIT}. No se modificó ningún dato.`);
  }
  const batch = writeBatch(db);
  operations.forEach((operation) => {
    const ref = entryRef(uid, operation.date);
    if (operation.type === 'delete') batch.delete(ref);
    else batch.set(ref, payloadFor(operation.entry));
  });
  await batch.commit();
}

export async function saveEntriesBatch(uid, entries) {
  assertUid(uid);
  entries.forEach(assertEntry);
  await commitOperations(uid, entries.map((entry) => ({ type: 'set', date: entry.date, entry })));
}

export async function saveEntriesInChunks(uid, entries) {
  assertUid(uid);
  entries.forEach(assertEntry);
  let written = 0;
  for (let index = 0; index < entries.length; index += BATCH_LIMIT) {
    const chunk = entries.slice(index, index + BATCH_LIMIT);
    await commitOperations(uid, chunk.map((entry) => ({ type: 'set', date: entry.date, entry })));
    written += chunk.length;
  }
  return written;
}

export async function replaceAllEntries(uid, nextEntries, currentEntries = null) {
  assertUid(uid);
  nextEntries.forEach(assertEntry);
  const existing = currentEntries || await getAllEntries(uid);
  const nextDates = new Set(nextEntries.map((entry) => entry.date));
  const operations = [
    ...nextEntries.map((entry) => ({ type: 'set', date: entry.date, entry })),
    ...existing.filter((entry) => !nextDates.has(entry.date))
      .map((entry) => ({ type: 'delete', date: entry.date })),
  ];
  await commitOperations(uid, operations);
  return { written: nextEntries.length, deleted: operations.length - nextEntries.length };
}

export async function deleteAllEntries(uid, currentEntries = null) {
  assertUid(uid);
  const existing = currentEntries || await getAllEntries(uid);
  await commitOperations(uid, existing.map((entry) => ({ type: 'delete', date: entry.date })));
  return existing.length;
}
