import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "../estilos/Auth.scss";

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
    <div className="auth-container">
      <div className="auth-title">Recuperar contraseña</div>
      <form onSubmit={handlePasswordReset} className="auth-form">
        <div className="auth-input-group">
        <input
          type="email"
          className="auth-input"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        </div>

        <button className="button" type="submit">
          Enviar enlace
        </button>
      
      </form>
      {message && <p className="auth-success">{message}</p>}
      {error && <p className="auth-error">{error}</p>}
      <p className="auth-switch-text">
        ¿Recordaste tu contraseña?{" "}
        <button className="auth-switch-button" onClick={onBackToLogin}>
          Volver al login
        </button>
      </p>
    </div>
  );
};

export default RecuperarPassword;
