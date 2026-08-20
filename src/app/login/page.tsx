"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { fetchApi } from "../../lib/api";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Info, X } from "lucide-react";
import { useAuth, UserProfile } from "../../lib/auth-context";
import { JerokyBrandHeader } from "../../components/ui/logo";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [forgotNotice, setForgotNotice] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const hasAccess = ["Administrator", "Docente", "Operador"].includes(user.role);
      if (hasAccess) {
        router.push("/alumnos");
      } else {
        logout();
        setTimeout(() => {
          setError("Tu usuario no tiene permisos para acceder a esta aplicación.");
        }, 0);
      }
    }
  }, [user, loading, router, logout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor ingrese el correo y la contraseña");
      return;
    }

    setLoadingSubmit(true);
    setError("");

    try {
      const res = await fetchApi<{ access_token: string; user: UserProfile }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res && res.access_token) {
        login(res.access_token, res.user);
      } else {
        throw new Error("Respuesta de autenticación inválida");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Credenciales inválidas";
      setError(message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Mostrar indicador de carga mientras comprobamos sesión o si hay un usuario válido redirigiendo
  if (loading || (user && ["Administrator", "Docente", "Operador"].includes(user.role))) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C58A2] mx-auto"></div>
          <p className="text-sm text-slate-500 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-[440px] border border-slate-200/80 bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-10">
        {/* Header con Logo y Marca */}
        <JerokyBrandHeader stacked logoSize={112} className="mb-8" />

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3.5 text-xs font-medium text-red-700 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {forgotNotice && (
            <div className="p-3.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-xl border border-blue-200 flex items-start justify-between gap-2 animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-[#2C58A2] shrink-0 mt-0.5" />
                <span>Por favor contacte al administrador del sistema para restablecer sus credenciales de acceso.</span>
              </div>
              <button
                type="button"
                onClick={() => setForgotNotice(false)}
                className="text-blue-500 hover:text-blue-700 p-0.5 rounded-md"
                aria-label="Cerrar aviso"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Campo de Correo Electrónico */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-bold text-slate-800">
              Correo Electrónico
            </Label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#2C58A2] pointer-events-none">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                placeholder="ejemplo@jeroky.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2C58A2] focus:ring-3 focus:ring-[#2C58A2]/15 transition-all"
              />
            </div>
          </div>

          {/* Campo de Contraseña */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-bold text-slate-800">
              Contraseña
            </Label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#2C58A2] pointer-events-none">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2C58A2] focus:ring-3 focus:ring-[#2C58A2]/15 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-[#2C58A2] hover:text-[#1E3A8A] transition-colors p-1"
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Botón Iniciar Sesión */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loadingSubmit}
              className="w-full py-3.5 h-auto text-base font-bold bg-[#2C58A2] hover:bg-[#224683] text-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              {loadingSubmit ? "Iniciando Sesión..." : "Iniciar Sesión"}
            </Button>
          </div>

          {/* Enlace Olvidaste tu contraseña */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setForgotNotice(true)}
              className="text-sm font-medium text-[#2C58A2] hover:text-[#1E3A8A] hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
