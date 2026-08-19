"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { fetchApi } from "../../lib/api";
import { GraduationCap } from "lucide-react";
import { useAuth, UserProfile } from "../../lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-slate-200 shadow-xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto p-3 bg-primary text-primary-foreground rounded-xl w-fit">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">JEROKY SOFT</CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Academia de Danza Jeroky
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@jeroky.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full font-bold" disabled={loadingSubmit}>
              {loadingSubmit ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
