import React, { useState, useContext } from 'react';
import { updateProfile } from 'firebase/auth';
import Context from '@/context';
import ModalEditar from '@/componentes/ModalEditar';
import { guardarDatosPerfil } from '@/services/firebase/profileService';
import buttonStyles from '@/styles/Botones.module.scss';
import authStyles from '@/componentes/Auth/Auth.module.scss';
import modalStyles from '@/componentes/ModalEditar/ModalEditar.module.scss';

const ActualizarPerfil = ({ onClose, required = false }) => {
//   const { user, setUser } = useContext(Context);
const context = useContext(Context)
const [focused, setFocused] = useState("");
  const [firstName, setFirstName] = useState(context.profile?.firstName || '');
  const [lastName, setLastName] = useState(context.profile?.lastName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActualizar = async () => {
    
      if (!context.user) {
    setError('Usuario no autenticado.');
    return;
  }
    
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName || !normalizedLastName) {
      setError('Completa nombre y apellido');
      return;
    }

    try {
      setLoading(true);
      const fullName = `${normalizedFirstName} ${normalizedLastName}`;
      await updateProfile(context.user, { displayName: fullName });
        await guardarDatosPerfil(context.user.uid, normalizedFirstName, normalizedLastName);
        context.setProfile({ firstName: normalizedFirstName, lastName: normalizedLastName });
       // Limpieza final si todo sale bien
        setError('');
      onClose?.();
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
            <div className={modalStyles.modalTitle}>{required ? 'COMPLETAR PERFIL' : 'ACTUALIZAR PERFIL'}</div>
            {required && <p>Ingresá tu nombre y apellido para continuar.</p>}
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
                    {!required && (
                      <button onClick={onClose} className={`${buttonStyles.button} ${buttonStyles.danger} ${modalStyles.button}`}>Cancelar</button>
                    )}
                </div>
            </div>
        </div>
    </ModalEditar>
  );
};

export default ActualizarPerfil;
