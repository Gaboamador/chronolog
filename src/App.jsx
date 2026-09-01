import React, { useEffect, useState, useContext } from 'react';
import Context from '@/context';
import './App.scss';
import GlobalState from '@/globalState';
import { sendEmailVerification } from 'firebase/auth';
import Header from '@/componentes/Header';
import FormularioHora from '@/componentes/FormularioHora';
import ResumenSemana from '@/componentes/ResumenSemana';
import Auth from '@/componentes/Auth';
import Loader from '@/componentes/Loader';
import HorarioPersonal from '@/componentes/HorarioPersonal';
import LegacyMigrationGate from '@/componentes/LegacyMigrationGate';
import MonthlySummaryModal from '@/componentes/MonthlySummaryModal';
import {ToastProvider} from '@/context/ToastContext';
import authStyles from '@/componentes/Auth/Auth.module.scss';
import buttonStyles from '@/styles/Botones.module.scss';

function AppContent() {
  const context = useContext(Context)
  const [verificationSent, setVerificationSent] = useState(false);
  const [mostrarResumenMensual, setMostrarResumenMensual] = useState(false);
  const [historicalEntries, setHistoricalEntries] = useState([]);

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

const handleOpenMonthlySummary = async () => {
  try {
    const allEntries = await context.exportAllEntries();
    setHistoricalEntries(allEntries);
    setMostrarResumenMensual(true);
  } catch (error) {
    console.error('Error cargando el resumen histórico:', error);
    alert('No se pudo cargar el historial completo.');
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
          <div className={authStyles.authContainer}>
            <div className={authStyles.authTitle}>Verificar correo electrónico</div>
            <div className={authStyles.authForm}>
            <div className="verificationError">
              <span>Tu correo electrónico aún no fue verificado.</span>
              <span>Por favor, revisa tu bandeja de entrada y sigue el enlace de verificación que te enviamos para completar este paso.</span>
              <span>Si no encuentras el correo, revisa tu carpeta de spam o solicita un nuevo enlace de verificación.</span>
            </div>

            <button className={`${buttonStyles.button} ${buttonStyles.primary}`} onClick={handleResendVerification}>Reenviar correo de verificación</button>
            <button className={`${buttonStyles.button} ${buttonStyles.secondary}`} onClick={() => window.location.reload()}>Ya verifiqué</button>
            <button className={`${buttonStyles.button} ${buttonStyles.danger}`} onClick={() => {context.logout()}}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!context.legacyMigrationChecked) {
    return (
      <div className="App">
        <Header hideUserMenu />
        <div className="body"><Loader /></div>
      </div>
    );
  }

  if (context.legacyPendingCount > 0 || context.legacyUnassignedCount > 0) {
    return (
      <div className="App">
        <Header hideUserMenu />
        <LegacyMigrationGate />
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

        <div className="monthlySummaryTriggerContainer">
          <button
            type="button"
            className="monthly-summary-trigger"
            onClick={handleOpenMonthlySummary}
          >
            Promedios por mes
          </button>
        </div>
      </>
    )}
      </div>

      <MonthlySummaryModal
        isOpen={mostrarResumenMensual}
        onClose={() => setMostrarResumenMensual(false)}
        entries={historicalEntries}
        defaultWorkTime={context.defaultWorkTime}
      />

    </div>
  );
}

function App() {
  return (
    <GlobalState>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </GlobalState>
  );
}

export default App;
