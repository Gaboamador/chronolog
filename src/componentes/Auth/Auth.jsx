import React, { useState } from "react";
import Login from "@/componentes/Login";
import RecuperarPassword from "@/componentes/RecuperarPassword";

const Auth = () => {
  const [showRecovery, setShowRecovery] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      {showRecovery ? (
        <RecuperarPassword onBackToLogin={() => setShowRecovery(false)} />
      ) : (
        <Login
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          setShowRecovery={setShowRecovery}
        />
      )}
    </div>
  );
};

export default Auth;
