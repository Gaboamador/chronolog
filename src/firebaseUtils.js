// src/firebaseUtils.js
import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

/**
 * Guarda una entrada de tiempo por fecha en la subcolección 'entries' del usuario.
 */
export const guardarEntrada = async (uid, entrada) => {
  try {
    const docRef = doc(db, 'users', uid, 'entries', entrada.date);
    await setDoc(docRef, entrada);
  } catch (error) {
    console.error('Error al guardar la entrada:', error);
  }
};

/**
 * Carga todas las entradas del usuario autenticado.
 */
export const obtenerEntradas = async (uid) => {
  try {
    const entriesRef = collection(db, 'users', uid, 'entries');
    const snapshot = await getDocs(entriesRef);
    const datos = snapshot.docs.map((doc) => doc.data());
    // Aquí aplanamos la estructura para que sea [{date, start, end}, ...]
    const flattened = datos.map(item => ({
      date: item.date,
      start: item.entries[0]?.start || '',
      end: item.entries[0]?.end || ''
    }));
    return flattened;
  } catch (error) {
    console.error('Error al obtener entradas:', error);
    return [];
  }
};

// Elimina una entrada por fecha
export const eliminarEntrada = async (uid, dateStr) => {
  try {
    const docRef = doc(db, 'users', uid, 'entries', dateStr);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar la entrada:', error);
  }
};


/** Guarda datos del perfil de usuario en Firestore */
export const guardarDatosPerfil = async (uid, firstName, lastName) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { firstName, lastName }, { merge: true });
};


/** Guarda el horario personal por defecto en Firestore */
export const guardarHorarioPorDefecto = async (uid, start, end) => {
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'defaultWorkTime');
    await setDoc(docRef, {
      defaultPersonalStartTime: start,
      defaultPersonalEndTime: end,
    });
  } catch (error) {
    console.error('Error al guardar el horario por defecto:', error);
  }
};

/** Obtiene el horario personal por defecto desde Firestore */
export const obtenerHorarioPorDefecto = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'defaultWorkTime');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null
    // return {
    //   defaultPersonalStartTime: '09:00',
    //   defaultPersonalEndTime: '17:00',
    // };
  } catch (error) {
    console.error('Error al obtener el horario por defecto:', error);
    return null
    // return {
    //   defaultPersonalStartTime: '09:00',
    //   defaultPersonalEndTime: '17:00',
    // };
  }
};