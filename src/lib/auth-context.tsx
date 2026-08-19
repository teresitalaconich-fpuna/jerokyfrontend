"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "./api";

export type UserRole = 'Administrator' | 'Docente' | 'Operador' | 'Alumno' | 'Tutor';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("jeroky_token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const profile = await fetchApi<UserProfile>("/auth/me");
          setUser(profile);
        } catch (err) {
          console.error("No se pudo cargar el perfil de usuario al iniciar:", err);
          // Token inválido o expirado
          localStorage.removeItem("jeroky_token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    localStorage.setItem("jeroky_token", newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("jeroky_token");
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const profile = await fetchApi<UserProfile>("/auth/me");
      setUser(profile);
      return profile;
    } catch (err) {
      console.error("Error al actualizar perfil de usuario:", err);
      logout();
      return null;
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider");
  }
  return context;
}
