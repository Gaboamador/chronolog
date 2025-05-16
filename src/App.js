import React, { useEffect, useState, useContext } from 'react';
import Context from './context';
import './App.scss';
import GlobalState from './globalState';
import Header from './componentes/Header';
import FormularioHora from './componentes/FormularioHora';
import ResumenSemana from './componentes/ResumenSemana';
import Auth from './componentes/Auth';
import Loader from './componentes/Loader';

function AppContent() {
  const context = useContext(Context)

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

   return (
    <div className="App">
      <Header />
      <div className="body">
        <FormularioHora />
        <ResumenSemana />
      </div>
    </div>
  );

// return (
//     <div className="App">
//       <Header />
//       <div className="body">
//         {context.user ? (
//           <>
//             <FormularioHora />
//             <ResumenSemana />
//           </>
//         ) : (
//           <Auth />
//         )}
//       </div>
//     </div>
//   );

}

function App() {
   return (
    <GlobalState>
      <AppContent />
    </GlobalState>
  );
}

export default App;
