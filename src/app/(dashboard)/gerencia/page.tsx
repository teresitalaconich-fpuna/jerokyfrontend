"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { fetchApi, ensureAuth } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { Users, GraduationCap, Calendar, BarChart3, AlertCircle } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalModalities: number;
  averageAttendance: number;
  performanceByStyle: { style: string; average: number }[];
  capacityRates: {
    courseId?: string;
    courseName: string;
    level?: string;
    enrolled: number;
    capacity: number;
    rate: number;
  }[];
}

const COLORS = ["#1e293b", "#3b82f6", "#f97316", "#10b981", "#a855f7"];

const initialStats: DashboardStats = {
  totalStudents: 0,
  totalTeachers: 0,
  totalModalities: 0,
  averageAttendance: 0,
  performanceByStyle: [],
  capacityRates: []
};

export default function GerenciaDashboard() {
  const { user } = useAuth();
  const role = user?.role || null;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(initialStats);

  useEffect(() => {
    ensureAuth();

    const loadStats = async () => {
      try {
        const data = await fetchApi<DashboardStats>("/system/dashboard-stats");
        if (data) {
          setStats(data);
        }
      } catch {
        setStats(initialStats);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Cargando estadísticas gerenciales...</div>;
  }

  // RBAC Client check
  const isAuthorized = role === "Administrator";
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white border border-slate-200 rounded-xl shadow-lg space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground">
          Esta sección está restringida únicamente para la **Dirección** o el **Administrador** del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Panel Gerencial</h1>
        <p className="text-sm text-muted-foreground">Métricas e indicadores globales de rendimiento y capacidad.</p>
      </div>

      {/* Grid KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4 p-6">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold">ALUMNOS ACTIVOS</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalStudents}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-6">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold">DOCENTES ACTIVOS</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalTeachers}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-6">
          <div className="p-3 bg-purple-100 text-purple-800 rounded-lg">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold">MODALIDADES</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalModalities}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-6">
          <div className="p-3 bg-orange-100 text-orange-800 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold">ASISTENCIA PROMEDIO</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.averageAttendance}%</h3>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Style averages bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento Académico por Estilo</CardTitle>
            <CardDescription>Promedio de notas agrupadas por modalidad de danza.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.performanceByStyle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="style" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="average" fill="#1e293b" radius={[4, 4, 0, 0]}>
                  {stats.performanceByStyle.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Capacity Rate Progress card */}
        <Card>
          <CardHeader>
            <CardTitle>Ocupación y Capacidad de Clases</CardTitle>
            <CardDescription>Capacidad física contratada vs inscriptos activos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.capacityRates.map((course) => (
              <div key={course.courseId || `${course.courseName}-${course.level || ''}`} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {course.courseName}
                    {course.level && !course.courseName.includes(course.level) ? ` - ${course.level}` : ""}
                  </span>
                  <span className="text-muted-foreground font-semibold">
                    {course.enrolled} / {course.capacity} ({course.rate}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      course.rate >= 90 
                        ? "bg-red-500" 
                        : course.rate >= 75 
                          ? "bg-amber-500" 
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${course.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
