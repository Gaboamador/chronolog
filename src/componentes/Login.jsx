import React, { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { FaEye, FaEyeSlash, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { auth } from "../firebase";
import zxcvbn from 'zxcvbn';
import "../estilos/Auth.scss";
import "../estilos/FuerzaPass.scss"

const Login = ({ isLogin, setIsLogin, setShowRecovery }) => {

  const [email, setEmail] = useState("");
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

  if (!email || (isLogin ? !password : !newPassword || !repeatPassword)) {
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
        await createUserWithEmailAndPassword(auth, email, newPassword);
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
    <div className="auth-container">
      <div className="auth-title">
        <div className="auth-icon">
          {isLogin ? <FaSignInAlt /> : <FaUserPlus />}
        </div>        
        {isLogin ? "Iniciar sesión" : "Registrarse"}
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
       <div className={`auth-input-group ${focused === 'email' || email ? 'focused' : ''}`}>
  <label className="auth-label">Correo electrónico</label>
  <input
    type="email"
    className="auth-input"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
      onFocus={() => setFocused('email')}
    onBlur={() => setFocused('')}
  />
</div>

{isLogin && 
<div className={`auth-input-group ${focused === 'password' || password ? 'focused' : ''}`}>
  <label className="auth-label">Contraseña</label>
  <input
    type={showPassword ? "text" : "password"}
    className="auth-input"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    onFocus={() => setFocused('password')}
    onBlur={() => setFocused('')}
  />
</div>
}

{!isLogin && (
  <>
  <div className={`auth-input-group ${focused === 'newPassword' || newPassword ? 'focused' : ''}`}>
  <label className="auth-label">Crear contraseña</label>
  <input
    type={showPassword ? "text" : "password"}
    className="auth-input"
    value={newPassword}
    onChange={handlePasswordChange}
onFocus={() => setFocused('newPassword')}
    onBlur={() => setFocused('')}
  />
</div>

  <div className={`auth-input-group ${focused === 'repeat' || repeatPassword ? 'focused' : ''}`}>
    <label className="auth-label">Repetir contraseña</label>
    <input
      type={showPassword ? "text" : "password"}
      className="auth-input"
      value={repeatPassword}
      onChange={(e) => setRepeatPassword(e.target.value)}
      onFocus={() => setFocused('repeat')}
      onBlur={() => setFocused('')}
    />
  </div>
    {newPassword && (
        <div className="password-strength">
          <div className={`strength-bar strength-${passwordScore}`} />
          <p className="strength-label">{getStrengthLabel()}</p>
        </div>
      )}
  </>
)}


        <div className="auth-input-group">
          <div className="checkbox-container">
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

        <button type="submit" className="auth-button">
          {isLogin ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {error && (
        <div className="auth-error">
          {errorCode === "auth/invalid-credential" ? (
            <>
              <span>
                Usuario o contraseña incorrecta.{" "}
              </span>
              <span
              className="auth-link"
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

      <p className="auth-switch-text">
        {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <button className="auth-switch-button"
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
