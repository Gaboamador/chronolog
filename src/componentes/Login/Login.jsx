import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from "firebase/auth";
import { FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { auth } from "@/firebase";
import zxcvbn from 'zxcvbn';
import buttonStyles from '@/styles/Botones.module.scss';
import authStyles from '@/componentes/Auth/Auth.module.scss';
import strengthStyles from './FuerzaPass.module.scss';

const Login = ({ isLogin, setIsLogin, setShowRecovery }) => {

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");

  const [newPassword, setNewPassword] = useState('');
  const [passwordScore, setPasswordScore] = useState(0);

const clearErrors = () => {
  setError("");
};

const firebaseErrorMessages = {
  "auth/email-already-in-use": "Este correo ya está registrado.",
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/user-not-found": "No se encontró un usuario con ese correo.",
  "auth/wrong-password": "La contraseña es incorrecta.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/missing-password": "Por favor, ingresá una contraseña.",
  "auth/network-request-failed": "Error de conexión. Verificá tu red.",
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

  if (!email || (isLogin ? !password : !newPassword || !repeatPassword || !firstName || !lastName)) {
    setError("Debes completar todos los campos.");
    return;
  }

    if (!isLogin && newPassword !== repeatPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, newPassword);
        const user = userCredential.user;
        // Configurar displayName
          const fullName = `${firstName.trim()} ${lastName.trim()}`;
          await updateProfile(user, { displayName: fullName });
        // Enviar correo de verificación
          await sendEmailVerification(user);
      }
    } catch (err) {
      const code = err.code;
      const customMessage = firebaseErrorMessages[code];
      if (customMessage) {
        setErrorCode(code);
        setError(customMessage);
      } else {
        setErrorCode(code);
        setError("Ocurrió un error inesperado. Intenta nuevamente.");
        console.error("Error no manejado:", code, err.message);
      }
    }
  };


 const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    const evaluation = zxcvbn(value);
    setPasswordScore(evaluation.score); // 0 a 4
  };

  const getStrengthLabel = () => {
    switch (passwordScore) {
      case 0:
      case 1:
        return 'Débil';
      case 2:
        return 'Aceptable';
      case 3:
        return 'Buena';
      case 4:
        return 'Fuerte';
      default:
        return '';
    }
  };



  return (
    <div className={authStyles.authContainer}>
      <div className={authStyles.authTitle}>
        <div className={authStyles.authIcon}>
          {isLogin ? <FaSignInAlt /> : <FaUserPlus />}
        </div>        
        {isLogin ? "Iniciar sesión" : "Registrarse"}
      </div>

      <form onSubmit={handleSubmit} className={authStyles.authForm}>
       <div className={`${authStyles.authInputGroup} ${focused === 'email' || email ? authStyles.focused : ''}`}>
  <label className={authStyles.authLabel}>Correo electrónico</label>
  <input
    type="email"
    className={authStyles.authInput}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
      onFocus={() => setFocused('email')}
    onBlur={() => setFocused('')}
    required
  />
</div>

{isLogin && 
<div className={`${authStyles.authInputGroup} ${focused === 'password' || password ? authStyles.focused : ''}`}>
  <label className={authStyles.authLabel}>Contraseña</label>
  <input
    type={showPassword ? "text" : "password"}
    className={authStyles.authInput}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    onFocus={() => setFocused('password')}
    onBlur={() => setFocused('')}
  />
</div>
}

{!isLogin && (
  <>
<div className={`${authStyles.authInputGroup} ${focused === 'firstName' || firstName ? authStyles.focused : ''}`}>
      <label className={authStyles.authLabel}>Nombre</label>
      <input
        type="text"
        className={authStyles.authInput}
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        onFocus={() => setFocused('firstName')}
        onBlur={() => setFocused('')}
        required
      />
    </div>
    <div className={`${authStyles.authInputGroup} ${focused === 'lastName' || lastName ? authStyles.focused : ''}`}>
      <label className={authStyles.authLabel}>Apellido</label>
      <input
        type="text"
        className={authStyles.authInput}
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        onFocus={() => setFocused('lastName')}
        onBlur={() => setFocused('')}
        required
      />
    </div>

  <div className={`${authStyles.authInputGroup} ${focused === 'newPassword' || newPassword ? authStyles.focused : ''}`}>
  <label className={authStyles.authLabel}>Crear contraseña</label>
  <input
    type={showPassword ? "text" : "password"}
    className={authStyles.authInput}
    value={newPassword}
    onChange={handlePasswordChange}
    onFocus={() => setFocused('newPassword')}
    onBlur={() => setFocused('')}
    required
  />
</div>

  <div className={`${authStyles.authInputGroup} ${focused === 'repeat' || repeatPassword ? authStyles.focused : ''}`}>
    <label className={authStyles.authLabel}>Repetir contraseña</label>
    <input
      type={showPassword ? "text" : "password"}
      className={authStyles.authInput}
      value={repeatPassword}
      onChange={(e) => setRepeatPassword(e.target.value)}
      onFocus={() => setFocused('repeat')}
      onBlur={() => setFocused('')}
      required
    />
  </div>
    {newPassword && (
        <div className={strengthStyles.passwordStrength}>
          <div className={`${strengthStyles.strengthBar} ${strengthStyles[`strength-${passwordScore}`]}`} />
          <p className={strengthStyles.strengthLabel}>{getStrengthLabel()}</p>
        </div>
      )}
  </>
)}


        <div className={authStyles.authInputGroup}>
          <div className={authStyles.checkboxContainer}>
            <label>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword((prev) => !prev)}
              />
              Mostrar contraseña
            </label>
          </div>
        </div>

        <div className={authStyles.submitButtonContainer}>
          <button
          type="submit"
          className={`${buttonStyles.button} ${buttonStyles.primary}`}
          >
            {isLogin ? "Entrar" : "Crear cuenta"}
          </button>
        </div>
      </form>

      {error && (
        <div className={authStyles.authError}>
          {errorCode === "auth/invalid-credential" ? (
            <>
              <span>
                Usuario o contraseña incorrecta.{" "}
              </span>
              <span
              className={authStyles.authLink}
              onClick={() => setShowRecovery(true)}
              >
                ¿Olvidaste tu contraseña?
              </span>
            </>
          ) : (
            error
          )}
        </div>
      )}

      <p className={authStyles.authSwitchText}>
        {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <button className={`${buttonStyles.button} ${buttonStyles.secondary} ${authStyles.authSwitchButton}`}
        onClick={() => {
            clearErrors();
            setIsLogin(!isLogin);
          }}
        >
          {isLogin ? "Registrarse" : "Iniciar sesión"}
        </button>
      </p>
    </div>
  );
};

export default Login;
