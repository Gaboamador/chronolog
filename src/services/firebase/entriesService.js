import { db } from '../../firebase';
import { doc, setDoc, getDocs, deleteDoc, collection } from 'firebase/firestore';
import { flattenFirestoreEntries } from '../../utils/entries/flattenFirestoreEntries';

/**
 * Guarda una entrada de tiempo por fecha en la subcolección 'entries' del usuario.
 *
 * Formato esperado:
 * {
 *   date: 'yyyy-MM-dd',
 *   entries: [{ date, start, end }]
 * }
 */
export const guardarEntrada = async (uid, entrada) => {
  try {
    if (!uid) {
      throw new Error('guardarEntrada: falta uid');
    }

    if (!entrada?.date) {
      throw new Error('guardarEntrada: falta entrada.date');
    }

    if (!Array.isArray(entrada.entries) || entrada.entries.length === 0) {
      throw new Error(
        `guardarEntrada: no se permite guardar una entrada vacía para la fecha ${entrada.date}`
      );
    }

    const docRef = doc(db, 'users', uid, 'entries', entrada.date);
    await setDoc(docRef, entrada, { merge: true });
  } catch (error) {
    console.error('Error al guardar la entrada:', error);
    throw error;
  }
};

/**
 * Carga todas las entradas del usuario autenticado.
 * Devuelve formato plano:
 * [{ date, start, end }]
 */
export const obtenerEntradas = async (uid) => {
  try {
    const entriesRef = collection(db, 'users', uid, 'entries');
    const snapshot = await getDocs(entriesRef);

    const datos = snapshot.docs.map((doc) => doc.data());

    return flattenFirestoreEntries(datos);

  } catch (error) {
    console.error('Error al obtener entradas:', error);
    throw error;
  }
};

/**
 * Elimina una entrada por fecha.
 */
export const eliminarEntrada = async (uid, dateStr) => {
  try {
    const docRef = doc(db, 'users', uid, 'entries', dateStr);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar la entrada:', error);
    throw error;
  }
};