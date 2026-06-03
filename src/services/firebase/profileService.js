import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

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