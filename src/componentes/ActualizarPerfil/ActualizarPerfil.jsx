import React, { useState, useContext } from 'react';
import { updateProfile } from 'firebase/auth';
import Context from '@/context';
import ModalEditar from '@/componentes/ModalEditar';
import { guardarDatosPerfil } from '@/services/firebase/profileService';
import buttonStyles from '@/styles/Botones.module.scss';
import authStyles from '@/componentes/Auth/Auth.module.scss';
import modalStyles from '@/componentes/ModalEditar/ModalEditar.module.scss';

const ActualizarPerfil = ({ onClose }) => {
//   const { user, setUser } = useContext(Context);
const context = useContext(Context)
const [focused, setFocused] = useState("");
  const [firstName, setFirstName] = useState(context.user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(context.user?.displayName?.split(' ')[1] || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActualizar = async () => {
    
      if (!context.user) {
    setError('Usuario no autenticado.');
    return;
  }
    
    if (!firstName || !lastName) {
      setError('Completa nombre y apellido');
      return;
    }

    try {
      setLoading(true);
      const fullName = `${firstName} ${lastName}`;
      await updateProfile(context.user, { displayName: fullName });
        await guardarDatosPerfil(context.user.uid, firstName, lastName);
      // Actualizar en contexto para reflejarlo en el menú
        context.setUser({ ...context.user, displayName: fullName });
       // Limpieza final si todo sale bien
        setError('');
      onClose();
    } catch (err) {
        console.error('Error actualizando perfil:', err);
        setError('Hubo un error al actualizar el perfil.');
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalEditar isOpen={true} onClose={onClose} permitirCerrar={false}>
        <div className={`${modalStyles.timeEntryContainer} ${modalStyles.modalSurface}`}>
            <div className={modalStyles.modalTitle}>ACTUALIZAR PERFIL</div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className={authStyles.authContainer}>
                <div className={authStyles.authForm}>
                    <div className={`${authStyles.authInputGroup} ${focused === 'firstName' || firstName ? authStyles.focused : ''}`}>
                        <label className={authStyles.authLabel}>Nombre</label>
                        <input
                            value={firstName}
                            placeholder={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={authStyles.authInput}
                            onFocus={() => setFocused('firstName')}
                            onBlur={() => setFocused('')}
                        />
                    </div>
                    <div className={`${authStyles.authInputGroup} ${focused === 'lastName' || lastName ? authStyles.focused : ''}`}>
                        <label className={authStyles.authLabel}>Apellido</label>
                        <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={authStyles.authInput}
                            onFocus={() => setFocused('lastName')}
                            onBlur={() => setFocused('')}
                        />
                    </div>
                    <button onClick={handleActualizar} disabled={loading} className={`${buttonStyles.button} ${buttonStyles.primary} ${modalStyles.button}`}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={onClose} className={`${buttonStyles.button} ${buttonStyles.secondary} ${modalStyles.button}`}>Cancelar</button>
                </div>
            </div>
        </div>
    </ModalEditar>
  );
};

export default ActualizarPerfil;
