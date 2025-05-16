import React, { useState, useEffect, useContext } from 'react';
import Context from '../context';

const Logout = () => {
  const context = useContext(Context)

  return <button onClick={context.logout}>Cerrar sesión</button>;
};

export default Logout;
