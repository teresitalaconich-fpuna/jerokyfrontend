"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../../components/ui/table";
import { fetchApi, ensureAuth } from "../../../../lib/api";

interface Course {
  id: string;
  name: string;
  level: string;
}

interface StudentReport {
  studentId: string;
  studentName: string;
  entradas: number;
  salidas: number;
  totalCheckins: number;
  percentage: number;
  classesHeld?: number;
  regularity?: string;
}

const mockCourses: Course[] = [
  { id: "c1", name: "Ballet Clásico", level: "Nivel Intermedio" },
  { id: "c2", name: "Ballet Clásico", level: "Nivel Avanzado" },
  { id: "c3", name: "Técnica de Puntas", level: "Nivel Avanzado" },
];

const mockReports: StudentReport[] = [
  { studentId: "s1", studentName: "Sofía Ayala", entradas: 19, salidas: 19, totalCheckins: 38, percentage: 95, classesHeld: 20, regularity: "REGULAR" },
  { studentId: "s2", studentName: "Mateo Paredes", entradas: 17, salidas: 16, totalCheckins: 33, percentage: 85, classesHeld: 20, regularity: "REGULAR" },
  { studentId: "s3", studentName: "Valentina Giménez", entradas: 12, salidas: 12, totalCheckins: 24, percentage: 60, classesHeld: 20, regularity: "IRREGULAR" },
];

export default function AsistenciaReportesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("c1");
  const [selectedPeriod, setSelectedPeriod] = useState("2026");
  const [loading, setLoading] = useState(false);

  const loadData = React.useCallback(async () => {
    try {
      await ensureAuth();
      const loadedCourses = await fetchApi<Course[]>("/courses");
      setCourses(loadedCourses.length > 0 ? loadedCourses : mockCourses);
      if (loadedCourses.length > 0) {
        setSelectedCourse((prev) => (prev === "c1" ? loadedCourses[0].id : prev));
      }
    } catch {
      setCourses(mockCourses);
    }
  }, []);

  const loadReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<StudentReport[]>(
        `/attendance/reports?courseId=${selectedCourse}&period=${selectedPeriod}`
      );
      setReports(data.length > 0 ? data : mockReports);
    } catch {
      setReports(mockReports);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedPeriod]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadData();
      }
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadReports();
      }
    });
    return () => {
      active = false;
    };
  }, [loadReports]);

  const classesHeldSummary = reports.length > 0 && reports[0].classesHeld !== undefined ? reports[0].classesHeld : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Panel de Asistencias</h1>
        <p className="text-sm text-muted-foreground">Consulte los porcentajes de asistencia calculados dinámicamente sobre las clases efectivamente dictadas.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
              <div className="space-y-1">
                <Label>Curso / Modalidad</Label>
                <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.level}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Período / Etapa</Label>
                <Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                  <option value="2026">Año Lectivo 2026 (Ciclo Completo)</option>
                  <option value="2026-I">Periodo 2026 - 1ª Etapa</option>
                  <option value="2026-II">Periodo 2026 - 2ª Etapa</option>
                  <option value="2025">Año Lectivo 2025</option>
                </Select>
              </div>
            </div>

            {classesHeldSummary !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 self-start sm:self-auto">
                <span>Clases Dictadas a la Fecha:</span>
                <span className="font-bold text-base text-blue-800">{classesHeldSummary}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Cargando reporte...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Entradas (Check-in)</TableHead>
                  <TableHead>Salidas (Check-out)</TableHead>
                  <TableHead>Total Registros</TableHead>
                  <TableHead>Cumplimiento Asistencia (%)</TableHead>
                  <TableHead>Regularidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((rep) => {
                  const regularity = rep.regularity || (rep.percentage >= 75 ? "REGULAR" : rep.percentage >= 70 ? "EN ALERTA" : "IRREGULAR");
                  const isRegular = regularity === "REGULAR";
                  const isAlert = regularity === "EN ALERTA";

                  return (
                    <TableRow key={rep.studentId}>
                      <TableCell className="font-semibold text-slate-800">{rep.studentName}</TableCell>
                      <TableCell>{rep.entradas}</TableCell>
                      <TableCell>{rep.salidas}</TableCell>
                      <TableCell>{rep.totalCheckins}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                isRegular
                                  ? "bg-emerald-500" 
                                  : isAlert 
                                    ? "bg-amber-500" 
                                    : "bg-destructive"
                              }`}
                              style={{ width: `${rep.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">
                            {rep.classesHeld !== undefined && rep.classesHeld > 0 ? (
                              <span>{rep.percentage}% <span className="text-xs text-muted-foreground font-normal">({rep.entradas}/{rep.classesHeld})</span></span>
                            ) : (
                              `${rep.percentage}%`
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isRegular
                            ? "bg-emerald-100 text-emerald-800" 
                            : isAlert
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-red-100 text-red-800"
                        }`}>
                          {regularity}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
