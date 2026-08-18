"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Users, 
  GraduationCap, 
  ClipboardList, 
  FileCheck, 
  MessageSquare, 
  BarChart3, 
  ShieldAlert, 
  Settings, 
  Camera, 
  LogOut,
  UserCheck,
  ChevronDown,
  BookOpen
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../lib/auth-context";

// Roles defined in backend
export type UserRole = 'Administrator' | 'Director' | 'Docente' | 'Operador' | 'Alumno' | 'Tutor';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navigation: SidebarItem[] = [
  { name: "Alumnos", href: "/alumnos", icon: Users, roles: ['Administrator', 'Director', 'Docente', 'Operador'] },
  { name: "Nuevo Registro", href: "/alumnos/nuevo", icon: UserCheck, roles: ['Administrator', 'Operador'] },
  { name: "Oferta Académica", href: "/oferta-academica", icon: BookOpen, roles: ['Administrator', 'Director'] },
  { name: "Matrículas", href: "/matriculas", icon: GraduationCap, roles: ['Administrator', 'Operador'] },
  { name: "Control Asistencia", href: "/asistencia/reportes", icon: ClipboardList, roles: ['Administrator', 'Director', 'Docente', 'Operador'] },
  { name: "Cargar Calificaciones", href: "/calificaciones/cargar", icon: FileCheck, roles: ['Administrator', 'Docente'] },
  { name: "Mensajería", href: "/comunicaciones", icon: MessageSquare, roles: ['Administrator', 'Director', 'Docente', 'Operador'] },
  { name: "Panel Gerencial", href: "/gerencia", icon: BarChart3, roles: ['Administrator', 'Director'] },
  { name: "Exportador MEC", href: "/gerencia/exportar", icon: FileCheck, roles: ['Administrator', 'Director'] },
  { name: "Usuarios y Permisos", href: "/admin/usuarios", icon: ShieldAlert, roles: ['Administrator'] },
  { name: "Mantenimiento y Auditoría", href: "/admin/sistema", icon: Settings, roles: ['Administrator'] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground font-semibold">Cargando panel seguro...</p>
        </div>
      </div>
    );
  }

  const visibleNav = navigation.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="p-2 bg-primary text-primary-foreground rounded-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-base leading-none">JEROKY SOFT</h1>
            <span className="text-xs text-muted-foreground font-medium">Centro de Danzas</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-slate-100 text-primary border-l-4 border-primary" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Access point terminal link */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <Link
            href="/access-point"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <Camera className="h-4 w-4" />
            Punto de Acceso
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-800">Jeroky Soft</h2>
            <span className="px-2 py-0.5 bg-accent/15 text-accent font-medium text-xs rounded-full">v1.0</span>
          </div>

          {/* User Profile / Menu */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold border border-slate-200">
                {user.role[0]}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-muted-foreground font-bold">{user.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-muted-foreground font-semibold truncate">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-slate-50 text-destructive transition-colors font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
