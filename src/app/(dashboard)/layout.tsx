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
  ShieldAlert, 
  Camera, 
  LogOut,
  ChevronDown,
  BookOpen,
  Calendar,
  Bell
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../lib/auth-context";
import { JerokyLogo } from "../../components/ui/logo";

// Roles defined in backend
export type UserRole = 'Administrator' | 'Docente' | 'Operador' | 'Alumno' | 'Tutor';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navigation: SidebarItem[] = [
  { name: "Alumnos", href: "/alumnos", icon: Users, roles: ['Administrator', 'Docente', 'Operador'] },
  { name: "Oferta Académica", href: "/oferta-academica", icon: BookOpen, roles: ['Administrator', 'Operador', 'Docente'] },
  { name: "Calendario Académico", href: "/admin/calendario", icon: Calendar, roles: ['Administrator', 'Operador'] },
  { name: "Matrículas", href: "/matriculas", icon: GraduationCap, roles: ['Administrator', 'Operador'] },
  { name: "Control Asistencia", href: "/asistencia/reportes", icon: ClipboardList, roles: ['Administrator', 'Docente', 'Operador'] },
  { name: "Cargar Calificaciones", href: "/calificaciones/cargar", icon: FileCheck, roles: ['Administrator', 'Docente'] },
  { name: "Mensajería", href: "/comunicaciones", icon: MessageSquare, roles: ['Administrator', 'Docente', 'Operador'] },
  { name: "Usuarios y Permisos", href: "/admin/usuarios", icon: ShieldAlert, roles: ['Administrator'] },
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
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (loading || !user) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C58A2] mx-auto"></div>
          <p className="text-sm text-slate-500 font-semibold">Cargando panel institucional...</p>
        </div>
      </div>
    );
  }

  const visibleNav = navigation.filter(item => item.roles.includes(user.role));

  const userInitials = `${user.firstName?.[0] || 'A'}${user.lastName?.[0] || 'D'}`.toUpperCase();
  const displayName = `${user.firstName || 'Admin'} ${user.lastName || 'Jeroky'}`;
  const displayRole = user.role === 'Administrator' ? 'Administrador' : user.role;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200/90 shadow-xs z-20">
        {/* Brand Header in Sidebar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <JerokyLogo size={36} />
          <div className="flex flex-col min-w-0">
            <h1 className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight truncate">
              JEROKY SOFT
            </h1>
            <span className="text-[9px] font-bold text-[#2C58A2] tracking-wider uppercase truncate">
              ACADEMIA DE DANZA
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150",
                  isActive 
                    ? "bg-blue-50/90 text-[#2C58A2] font-bold border-l-4 border-[#2C58A2] shadow-2xs" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#2C58A2]" : "text-slate-400")} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Access point terminal link at bottom of sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <Link
            href="/access-point"
            className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 bg-[#2C58A2] hover:bg-[#224683] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <Camera className="h-4 w-4" />
            Punto de Acceso Biométrico
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Matches Image 2 */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/90 shadow-2xs z-10">
          {/* Left Brand info on Navbar */}
          <div className="flex items-center gap-3">
            <JerokyLogo size={36} className="md:hidden" />
            <div className="flex flex-col">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                JEROKY SOFT
              </h2>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#2C58A2] tracking-wider uppercase leading-tight">
                ACADEMIA DE DANZA JEROKY PARAGUAI
              </p>
            </div>
          </div>

          {/* Right Header: Notifications & User Profile */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button
              type="button"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors relative"
              title="Notificaciones"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* User Profile Badge */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                {/* Dark circular avatar with white initials - matching Image 2 */}
                <div className="w-9 h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">
                    {displayRole}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left hover:bg-red-50 text-red-600 transition-colors font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
