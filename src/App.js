import React, { useEffect, useState, useContext } from 'react';
import Context from './context';
import './App.scss';
import GlobalState from './globalState';
import { sendEmailVerification } from 'firebase/auth';
import Header from './componentes/Header';
import FormularioHora from './componentes/FormularioHora';
import ResumenSemana from './componentes/ResumenSemana';
import Auth from './componentes/Auth';
import Loader from './componentes/Loader';
import HorarioPersonal from './componentes/HorarioPersonal';

function AppContent() {
  const context = useContext(Context)
const [verificationSent, setVerificationSent] = useState(false);

useEffect(() => {
    const enviarVerificacion = async () => {
      if (context.user && !context.user.emailVerified && !verificationSent) {
        try {
          await sendEmailVerification(context.user);
          setVerificationSent(true);
          console.log('Correo de verificación enviado automáticamente.');
        } catch (error) {
          console.error('Error enviando verificación automática:', error);
        }
      }
    };

    enviarVerificacion();
  }, [context.user, verificationSent]);



const handleResendVerification = async () => {
  if (context.user && !context.user.emailVerified) {
    try {
      await sendEmailVerification(context.user);
      alert("Correo de verificación enviado nuevamente.");
    } catch (error) {
      console.error("Error al reenviar el correo:", error);
    }
  }
};



  if (context.loading) {
    return (
      <div className="App">
        <Header />
        <div className="body">
          <Loader/>
        </div>
      </div>
    );
  }
  
    // Solo mostrar login cuando ya se terminó de cargar y no hay usuario
  if (!context.user) {
    return (
      <div className="App">
          <Header />
        <div className="body">
          <Auth />
        </div>
      </div>
    );
  }

    if (context.user && !context.user.emailVerified) {
    return (
      <div className="App">
          <Header />
        <div className="body">
          <div className="auth-container">
            <div className="auth-title">Verificar correo electrónico</div>
            <div className="auth-form">
            <div className="verification-error">
              <span>Tu correo electrónico aún no fue verificado.</span>
              <span>Por favor, revisa tu bandeja de entrada y sigue el enlace de verificación que te enviamos para completar este paso.</span>
              <span>Si no encuentras el correo, revisa tu carpeta de spam o solicita un nuevo enlace de verificación.</span>
            </div>

            <button className="button" onClick={handleResendVerification}>Reenviar correo de verificación</button>
            <button className="button" onClick={() => window.location.reload()}>Ya verifiqué</button>
            <button className="button" onClick={() => {context.logout()}}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

   return (
    <div className="App">
      <Header />
      <div className="body">

      {context.mostrarModalHorario && (
      <HorarioPersonal
        onClose={() => {
          context.setNecesitaConfigurarHorario(false);
          context.setMostrarModalHorario(false);
        }}
      />
    )}

    {!context.necesitaConfigurarHorario && (
      <>
        <FormularioHora />
        <ResumenSemana />
      </>
    )}
      </div>
    </div>
  );
}

function App() {
   return (
    <GlobalState>
      <AppContent />
    </GlobalState>
  );
}

export default App;
