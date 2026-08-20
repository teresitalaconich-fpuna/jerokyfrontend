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
  Bell,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  // Lock body scroll when mobile menu drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200/90 shadow-xs z-20 shrink-0">
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

      {/* Mobile Drawer (Off-Canvas Navigation Menu) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 ease-out">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <JerokyLogo size={32} />
                <div className="flex flex-col min-w-0">
                  <h2 className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight truncate">
                    JEROKY SOFT
                  </h2>
                  <span className="text-[9px] font-bold text-[#2C58A2] tracking-wider uppercase truncate">
                    ACADEMIA DE DANZA
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User info mini-banner in drawer */}
            <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{displayRole}</p>
              </div>
            </div>

            {/* Navigation list */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menú Principal
              </p>
              {visibleNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      isActive 
                        ? "bg-blue-50 text-[#2C58A2] font-bold border-l-4 border-[#2C58A2] shadow-2xs" 
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#2C58A2]" : "text-slate-500")} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Bottom Actions */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/80 space-y-2">
              <Link
                href="/access-point"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 bg-[#2C58A2] hover:bg-[#224683] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                <Camera className="h-4 w-4" />
                Punto Biométrico
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center justify-center gap-2 w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-3.5 sm:px-6 bg-white border-b border-slate-200/90 shadow-2xs z-10 shrink-0">
          {/* Left: Mobile hamburger trigger + Brand info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Hamburger button for mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </button>

            <JerokyLogo size={32} className="md:hidden shrink-0" />
            <div className="flex flex-col min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                JEROKY SOFT
              </h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-[#2C58A2] tracking-wider uppercase leading-tight truncate">
                ACADEMIA DE DANZA
              </p>
            </div>
          </div>

          {/* Right Header: Notifications & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 sm:gap-3 px-1.5 sm:px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                {/* Dark circular avatar with white initials */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
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
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
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
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
