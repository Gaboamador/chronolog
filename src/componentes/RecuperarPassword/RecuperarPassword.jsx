import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase";
import buttonStyles from '@/styles/Botones.module.scss';
import authStyles from '@/componentes/Auth/Auth.module.scss';

const RecuperarPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const cleanedEmail = email.trim().toLowerCase();
      await sendPasswordResetEmail(auth, cleanedEmail);
    setMessage(
      "Si este correo está registrado, te hemos enviado un enlace para restablecer tu contraseña."
    );
  } catch (err) {
    setError("Hubo un error al enviar el correo.");
    console.error(err);
  }
  };

  return (
    <div className={authStyles.authContainer}>
      <div className={authStyles.authTitle}>Recuperar contraseña</div>
      <form onSubmit={handlePasswordReset} className={authStyles.authForm}>
        <div className={authStyles.authInputGroup}>
        <input
          type="email"
          className={authStyles.authInput}
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        </div>

        <button className={`${buttonStyles.button} ${buttonStyles.primary}`} type="submit">
          Enviar enlace
        </button>
      
      </form>
      {message && <p className={authStyles.authSuccess}>{message}</p>}
      {error && <p className={authStyles.authError}>{error}</p>}
      <p className={authStyles.authSwitchText}>
        ¿Recordaste tu contraseña?{" "}
        <button className={`${buttonStyles.button} ${buttonStyles.secondary} ${authStyles.authSwitchButton}`} onClick={onBackToLogin}>
          Volver al login
        </button>
      </p>
    </div>
  );
};

export default RecuperarPassword;
