import React, { useState } from 'react';
import './App.css';
import { BrowserRouter, useLocation } from 'react-router-dom';
import GlobalState from './globalState';
import Header from './componentes/Header';
import FormularioHora from './componentes/FormularioHora';
import ResumenSemana from './componentes/ResumenSemana';

function App() {


  const stored = localStorage.getItem('timeEntries');
  const entries = stored ? JSON.parse(stored) : [];

  return (
    <div className="App">
<GlobalState>
<Header/>
<div className="body">
<FormularioHora/>
<ResumenSemana entries={entries}/>
</div>
</GlobalState>
    </div>
  );
}

export default App;
