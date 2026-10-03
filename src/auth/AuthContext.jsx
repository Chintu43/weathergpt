import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(authService.getCurrentSession());
    setIsLoading(false);
  }, []);

  const login = async (email, password, phone) => {
    const newSession = await authService.login(email, password, phone);
    setSession(newSession);
    return newSession;
  };

  const adminLogin = async (email, password, phone) => {
    const newSession = await authService.adminLogin(email, password, phone);
    setSession(newSession);
    return newSession;
  };

  const register = async (name, email, password, phone) => {
    const newSession = await authService.register(name, email, password, phone);
    setSession(newSession);
    return newSession;
  };

  const logout = () => {
    authService.logout();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        isAuthenticated: !!session,
        isLoading,
        login,
        adminLogin,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
