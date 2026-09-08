import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const obtenerDatosPerfil = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
};

/**
 * Guarda datos del perfil de usuario en Firestore.
 */
export const guardarDatosPerfil = async (uid, firstName, lastName) => {
  const userRef = doc(db, 'users', uid);

  await setDoc(
    userRef,
    { firstName, lastName },
    { merge: true }
  );
};
