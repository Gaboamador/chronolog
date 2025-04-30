import React from 'react';
import '../estilos/Header.css';
import logo from '../logo.svg';
const Header = () => {
  return (
    <header className="app-header">
      <img src={logo} alt={""} className="logo"/>
      <div className="app-title">CONTROL HORARIO</div>
    </header>
  );
};

export default Header;
