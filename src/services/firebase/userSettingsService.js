import { db } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Guarda el horario personal por defecto en Firestore.
 */
export const guardarHorarioPorDefecto = async (uid, start, end) => {
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'defaultWorkTime');

    await setDoc(docRef, {
      defaultPersonalStartTime: start,
      defaultPersonalEndTime: end,
    });
  } catch (error) {
    console.error('Error al guardar el horario por defecto:', error);
    throw error;
  }
};

/**
 * Obtiene el horario personal por defecto desde Firestore.
 */
export const obtenerHorarioPorDefecto = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'defaultWorkTime');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data();
    }

    return null;
  } catch (error) {
    console.error('Error al obtener el horario por defecto:', error);
    throw error;
  }
};