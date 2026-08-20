"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  ensureAuth, 
  getAcademicPeriods, 
  getAcademicYears, 
  getCourses, 
  getAttendanceReports, 
  registerManualAttendance,
  getAttendancesByDate,
  deleteAttendance,
  IAcademicPeriod, 
  ICourse, 
  IStudentReport,
  IDailyAttendanceItem 
} from "@/lib/api";
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  X, 
  Users, 
  Calendar, 
  Printer, 
  Award, 
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Trash2,
  CalendarDays,
  Info
} from "lucide-react";

type Course = ICourse;
type StudentReport = IStudentReport;

const CANONICAL_STAGES = [
  { value: "Ciclo Completo", label: "Ciclo Completo (Año Lectivo)", defaultStart: "01-01", defaultEnd: "12-31" },
  { value: "1ª Etapa", label: "1ª Etapa", defaultStart: "02-01", defaultEnd: "06-30" },
  { value: "2ª Etapa", label: "2ª Etapa", defaultStart: "07-01", defaultEnd: "10-31" },
  { value: "Examen Final", label: "Examen Final", defaultStart: "11-01", defaultEnd: "11-30" },
  { value: "Recuperatorio", label: "Recuperatorio", defaultStart: "12-01", defaultEnd: "12-15" },
];

function formatDateForDisplay(dateStr?: string): string {
  if (!dateStr) return "";
  const cleanDate = dateStr.split("T")[0];
  const parts = cleanDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getStudentRegularity(percentage: number, regularityProp?: string): "REGULAR" | "EN ALERTA" | "IRREGULAR" {
  if (regularityProp === "REGULAR" || regularityProp === "EN ALERTA" || regularityProp === "IRREGULAR") {
    return regularityProp;
  }
  if (percentage >= 75) return "REGULAR";
  if (percentage >= 70) return "EN ALERTA";
  return "IRREGULAR";
}

const sanitizeCsvCell = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '""';
  let str = String(val).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
};

function getLocalTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AsistenciaReportesPage() {
  const currentYear = new Date().getFullYear();
  const todayStr = getLocalTodayDate();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [knownYears, setKnownYears] = useState<number[]>([
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicPeriods, setAcademicPeriods] = useState<IAcademicPeriod[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Ciclo Completo");
  const [loading, setLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Manual Attendance Modal State (Pase de Lista por Fecha)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedClassDate, setSelectedClassDate] = useState<string>(todayStr);
  const [dailyAttendances, setDailyAttendances] = useState<IDailyAttendanceItem[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [manualError, setManualError] = useState("");

  // Load initial courses, years and auth check
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        await ensureAuth();
        const [loadedCourses, loadedYears] = await Promise.all([
          getCourses().catch((err) => {
            console.error("Error al cargar cursos:", err);
            return [];
          }),
          getAcademicYears().catch((err) => {
            console.error("Error al cargar años:", err);
            return [];
          }),
        ]);

        if (!isMounted) return;

        const list = Array.isArray(loadedCourses) ? loadedCourses : [];
        setCourses(list);
        if (list.length > 0) {
          setSelectedCourse(list[0].id);
        }

        if (Array.isArray(loadedYears) && loadedYears.length > 0) {
          const set = new Set([...loadedYears, currentYear - 1, currentYear, currentYear + 1]);
          setKnownYears(Array.from(set).sort((a, b) => a - b));
        }
      } catch (err) {
        if (!isMounted) return;
        setCourses([]);
        setDataError("No se pudieron cargar los datos iniciales.");
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [currentYear]);

  // Load academic periods whenever the selected year changes
  useEffect(() => {
    let isMounted = true;

    async function loadPeriods() {
      try {
        const periods = await getAcademicPeriods(selectedYear);
        if (isMounted) {
          setAcademicPeriods(Array.isArray(periods) ? periods : []);
        }
      } catch {
        if (isMounted) {
          setAcademicPeriods([]);
        }
      }
    }

    loadPeriods();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  // Load reports whenever course, period, or year changes
  const loadReports = useCallback(
    async (courseId: string, period: string, year: number) => {
      if (!courseId) {
        setReports([]);
        return;
      }
      setLoading(true);
      setDataError(null);
      try {
        const data = await getAttendanceReports(courseId, period, year);
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        setReports([]);
        const msg = err instanceof Error ? err.message : "Error al cargar los reportes de asistencia";
        setDataError(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    if (selectedCourse) {
      Promise.resolve().then(() => {
        if (active) {
          loadReports(selectedCourse, selectedPeriod, selectedYear);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [selectedCourse, selectedPeriod, selectedYear, loadReports]);

  // Load daily attendances for a specific date in the modal
  const loadDailyAttendances = useCallback(
    async (courseId: string, date: string) => {
      if (!courseId || !date) return;
      setDailyLoading(true);
      setManualError("");
      try {
        const data = await getAttendancesByDate(courseId, date);
        setDailyAttendances(Array.isArray(data) ? data : []);
      } catch (err) {
        setDailyAttendances([]);
        const msg = err instanceof Error ? err.message : "Error al cargar la asistencia del día";
        setManualError(msg);
      } finally {
        setDailyLoading(false);
      }
    },
    []
  );

  // Trigger daily attendance load when date changes or modal opens
  useEffect(() => {
    let active = true;
    if (isManualModalOpen && selectedCourse && selectedClassDate) {
      Promise.resolve().then(() => {
        if (active) {
          loadDailyAttendances(selectedCourse, selectedClassDate);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isManualModalOpen, selectedCourse, selectedClassDate, loadDailyAttendances]);

  // Filter courses by year if applicable, or show all
  const filteredCourses = useMemo(() => {
    const yearCourses = courses.filter((c) => !c.year || c.year === selectedYear);
    return yearCourses.length > 0 ? yearCourses : courses;
  }, [courses, selectedYear]);

  // Auto-adjust course selection when year filter changes
  useEffect(() => {
    let active = true;
    if (filteredCourses.length > 0 && !filteredCourses.some((c) => c.id === selectedCourse)) {
      Promise.resolve().then(() => {
        if (active) {
          setSelectedCourse(filteredCourses[0].id);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [filteredCourses, selectedCourse]);

  // Resolved stage dates
  const resolvedStageDateRange = useMemo(() => {
    if (selectedPeriod === "Ciclo Completo") {
      return {
        startFormatted: `01/01/${selectedYear}`,
        endFormatted: `31/12/${selectedYear}`,
        isCustom: false,
      };
    }

    const matched = academicPeriods.find((p) => p.name === selectedPeriod && p.year === selectedYear);
    if (matched && matched.startDate && matched.endDate) {
      return {
        startFormatted: formatDateForDisplay(matched.startDate),
        endFormatted: formatDateForDisplay(matched.endDate),
        isCustom: true,
      };
    }

    const stageConfig = CANONICAL_STAGES.find((s) => s.value === selectedPeriod);
    if (stageConfig) {
      return {
        startFormatted: formatDateForDisplay(`${selectedYear}-${stageConfig.defaultStart}`),
        endFormatted: formatDateForDisplay(`${selectedYear}-${stageConfig.defaultEnd}`),
        isCustom: false,
      };
    }

    return null;
  }, [selectedPeriod, selectedYear, academicPeriods]);

  // Statistics summaries
  const currentCourseObj = courses.find((c) => c.id === selectedCourse);
  const classesHeldSummary = reports.length > 0 && reports[0].classesHeld !== undefined ? reports[0].classesHeld : 0;
  const classesScheduledSummary = reports.length > 0 && reports[0].classesScheduled !== undefined ? reports[0].classesScheduled : classesHeldSummary;

  const stats = useMemo(() => {
    if (reports.length === 0) {
      return { totalStudents: 0, averagePercentage: 0, regularCount: 0, alertCount: 0, irregularCount: 0 };
    }
    const totalStudents = reports.length;
    const sumPercentage = reports.reduce((acc, r) => acc + (r.percentage || 0), 0);
    const averagePercentage = Math.round(sumPercentage / totalStudents);

    let regularCount = 0;
    let alertCount = 0;
    let irregularCount = 0;

    reports.forEach((r) => {
      const reg = getStudentRegularity(r.percentage, r.regularity);
      if (reg === "REGULAR") regularCount++;
      else if (reg === "EN ALERTA") alertCount++;
      else irregularCount++;
    });

    return { totalStudents, averagePercentage, regularCount, alertCount, irregularCount };
  }, [reports]);

  // Manual Attendance Handlers (Contextualized by selectedClassDate)
  const handleRegisterManualForDate = async (studentId: string, type: "Entrada" | "Salida", studentName: string) => {
    setManualLoading(true);
    setManualMessage("");
    setManualError("");
    try {
      await registerManualAttendance(studentId, selectedCourse, type, selectedClassDate);
      setManualMessage(`Asistencia registrada: ${studentName} para la fecha ${formatDateForDisplay(selectedClassDate)}`);
      await loadDailyAttendances(selectedCourse, selectedClassDate);
      loadReports(selectedCourse, selectedPeriod, selectedYear);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al registrar asistencia";
      setManualError(msg);
    } finally {
      setManualLoading(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId: string, studentName: string) => {
    const confirmed = window.confirm(`¿Está seguro de anular la asistencia de ${studentName} en la fecha ${formatDateForDisplay(selectedClassDate)}?`);
    if (!confirmed) return;

    setManualLoading(true);
    setManualMessage("");
    setManualError("");
    try {
      await deleteAttendance(attendanceId);
      setManualMessage(`Asistencia anulada para ${studentName}`);
      await loadDailyAttendances(selectedCourse, selectedClassDate);
      loadReports(selectedCourse, selectedPeriod, selectedYear);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al anular la asistencia";
      setManualError(msg);
    } finally {
      setManualLoading(false);
    }
  };

  const handleRegisterAllForDate = async (type: "Entrada" | "Salida") => {
    const absentStudents = dailyAttendances.filter((item) => !item.isPresent);
    if (absentStudents.length === 0) {
      setManualMessage(`Todas las alumnas ya tienen asistencia registrada para el día ${formatDateForDisplay(selectedClassDate)}.`);
      return;
    }

    setManualLoading(true);
    setManualMessage("");
    setManualError("");

    try {
      const CHUNK_SIZE = 5;
      const results: PromiseSettledResult<void>[] = [];
      for (let i = 0; i < absentStudents.length; i += CHUNK_SIZE) {
        const chunk = absentStudents.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.allSettled(
          chunk.map((item) => registerManualAttendance(item.studentId, selectedCourse, type, selectedClassDate))
        );
        results.push(...chunkResults);
      }

      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.filter((r) => r.status === "rejected").length;

      if (rejected === 0) {
        setManualMessage(`Pase de lista completado para el día ${formatDateForDisplay(selectedClassDate)} (${fulfilled} alumnas marcadas).`);
      } else {
        setManualError(`Se registraron ${fulfilled} asistencias correctamente, pero fallaron ${rejected}.`);
      }
      await loadDailyAttendances(selectedCourse, selectedClassDate);
      loadReports(selectedCourse, selectedPeriod, selectedYear);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error durante el pase de lista masivo";
      setManualError(msg);
    } finally {
      setManualLoading(false);
    }
  };

  // Export to CSV handler
  const handleExportCSV = () => {
    if (reports.length === 0) return;

    const courseLabel = currentCourseObj ? `${currentCourseObj.name} - ${currentCourseObj.level}` : "Curso";
    const header = ["Estudiante", "Año Lectivo", "Etapa", "Clases Dictadas (Efectivas)", "Clases Programadas", "Clases Asistidas", "Entradas (Check-in)", "Salidas (Check-out)", "Total Marcaciones", "Porcentaje Asistencia", "Regularidad"];
    
    const rows = reports.map((r) => {
      const regularity = getStudentRegularity(r.percentage, r.regularity);
      const attended = r.attendedClasses ?? (
        r.classesHeld !== undefined && r.classesHeld > 0
          ? Math.min(r.presentCount ?? r.entradas, r.classesHeld)
          : (r.presentCount ?? r.entradas)
      );
      return [
        sanitizeCsvCell(r.studentName),
        sanitizeCsvCell(selectedYear),
        sanitizeCsvCell(selectedPeriod),
        sanitizeCsvCell(r.classesHeld ?? classesHeldSummary),
        sanitizeCsvCell(r.classesScheduled ?? classesScheduledSummary),
        sanitizeCsvCell(attended),
        sanitizeCsvCell(r.entradas),
        sanitizeCsvCell(r.salidas),
        sanitizeCsvCell(r.totalCheckins),
        sanitizeCsvCell(`${r.percentage}%`),
        sanitizeCsvCell(regularity),
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [header.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Asistencia_${courseLabel.replace(/\s+/g, "_")}_${selectedPeriod}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Compute dynamic periods options for the select filter
  const availablePeriodsOptions = useMemo(() => {
    const options = [
      { value: "Ciclo Completo", label: "Ciclo Completo (Año Lectivo)" },
    ];
    if (academicPeriods && academicPeriods.length > 0) {
      academicPeriods.forEach((p) => {
        options.push({ value: p.name, label: p.name });
      });
    } else {
      CANONICAL_STAGES.filter((s) => s.value !== "Ciclo Completo").forEach((s) => {
        options.push({ value: s.value, label: s.label });
      });
    }
    return options;
  }, [academicPeriods]);

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Panel de Asistencias</h1>
          <p className="text-sm text-muted-foreground">
            Consulte porcentajes de asistencia y regularidad calculados sobre las clases dictadas efectivas de la etapa.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={reports.length === 0}
            className="flex items-center gap-1.5 text-slate-700 bg-white shadow-sm hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={reports.length === 0}
            className="flex items-center gap-1.5 text-slate-700 bg-white shadow-sm hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 text-slate-600" /> Imprimir / PDF
          </Button>
          <Button 
            onClick={() => {
              setIsManualModalOpen(true);
              setManualMessage("");
              setManualError("");
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground shadow-sm font-semibold"
          >
            <UserCheck className="h-4 w-4" /> Pase de Lista por Fecha
          </Button>
        </div>
      </div>

      {dataError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 print:hidden">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{dataError}</span>
        </div>
      )}

      {/* Print Document Title Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">CENTRO DE DANZAS JEROKY SOFT</h1>
        <h2 className="text-lg font-semibold text-slate-700 mt-1">Informe Oficial de Asistencia y Regularidad</h2>
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-600">
          <div><span className="font-semibold">Curso:</span> {currentCourseObj?.name} - {currentCourseObj?.level}</div>
          <div><span className="font-semibold">Año Lectivo:</span> {selectedYear}</div>
          <div><span className="font-semibold">Etapa:</span> {selectedPeriod}</div>
          {resolvedStageDateRange && (
            <div className="col-span-3">
              <span className="font-semibold">Rango Temporal:</span> {resolvedStageDateRange.startFormatted} al {resolvedStageDateRange.endFormatted}
            </div>
          )}
        </div>
      </div>

      {/* Filters Card */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Filtros de Consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="year-select" className="text-xs font-semibold text-slate-700">Año Lectivo</Label>
              <Select 
                id="year-select"
                value={selectedYear.toString()} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              >
                {knownYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Ciclo Lectivo {yr} {yr === currentYear ? "(Actual)" : yr < currentYear ? "(Histórico)" : "(Futuro)"}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-select" className="text-xs font-semibold text-slate-700">Curso / Modalidad</Label>
              <Select 
                id="course-select"
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                disabled={filteredCourses.length === 0}
              >
                {filteredCourses.length === 0 && (
                  <option value="">Cargando cursos...</option>
                )}
                {filteredCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.level}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="period-select" className="text-xs font-semibold text-slate-700">Etapa Evaluativa</Label>
              <Select 
                id="period-select"
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {availablePeriodsOptions.map((stg) => (
                  <option key={stg.value} value={stg.value}>{stg.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Temporal Boundaries Badge Info */}
          {resolvedStageDateRange && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>
                  Intervalo oficial de la etapa: <strong className="text-slate-800">{resolvedStageDateRange.startFormatted}</strong> al <strong className="text-slate-800">{resolvedStageDateRange.endFormatted}</strong>
                </span>
                {resolvedStageDateRange.isCustom ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                    Calendario Institucional
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                    Calendario Estándar
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-medium text-slate-700 flex-wrap">
                <span className="flex items-center gap-1">
                  Clases dictadas efectivas:
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold rounded border border-blue-200">
                    {classesHeldSummary} clases
                  </span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-slate-500">
                  Programadas:
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200">
                    {classesScheduledSummary} clases
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards Summary */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Total Alumnas</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{stats.totalStudents}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Inscritas activas</p>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Asistencia Promedio</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{stats.averagePercentage}%</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Rendimiento grupal</p>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Regulares (≥ 75%)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.regularCount}</div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Regulares</p>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">En Alerta / Irregulares</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700">
              {stats.alertCount + stats.irregularCount}
            </div>
            <p className="text-[11px] text-amber-600 mt-0.5">
              {stats.alertCount} en alerta / {stats.irregularCount} irregular
            </p>
          </Card>
        </div>
      )}

      {/* Main Reports Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">
              Listado de Asistencia por Alumna
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Curso: <strong className="text-slate-700">{currentCourseObj ? `${currentCourseObj.name} - ${currentCourseObj.level}` : "Seleccione un curso"}</strong> | Etapa: <strong className="text-slate-700">{selectedPeriod} ({selectedYear})</strong>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm font-medium">Calculando métricas de asistencia...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {filteredCourses.length === 0 
                ? "No hay cursos registrados para el año seleccionado."
                : !selectedCourse 
                ? "Seleccione un curso para ver el reporte de asistencia."
                : "No se encontraron inscripciones o registros de asistencia para este curso y período."}
            </div>
          ) : (
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="font-semibold text-slate-700">Alumna</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Clases Asistidas</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Salidas (Check-out)</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Total Marcaciones</TableHead>
                  <TableHead className="font-semibold text-slate-700">Cumplimiento (%)</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Regularidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((rep) => {
                  const regularityLabel = getStudentRegularity(rep.percentage, rep.regularity);
                  const isRegular = regularityLabel === "REGULAR";
                  const isAlert = regularityLabel === "EN ALERTA";
                  const effectiveAttended = rep.attendedClasses ?? (
                    rep.classesHeld !== undefined && rep.classesHeld > 0
                      ? Math.min(rep.presentCount ?? rep.entradas, rep.classesHeld)
                      : (rep.presentCount ?? rep.entradas)
                  );

                  return (
                    <TableRow key={rep.studentId} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-semibold text-slate-800">
                        {rep.studentName}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-slate-800">{effectiveAttended}</span>
                        {rep.classesHeld !== undefined && rep.classesHeld > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">/ {rep.classesHeld} dictadas</span>
                        )}
                        {rep.entradas > effectiveAttended && (
                          <span className="block text-[10px] text-muted-foreground">
                            ({rep.entradas} entradas reg.)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        {rep.salidas}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-700">
                        {rep.totalCheckins}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isRegular ? "bg-emerald-500" : isAlert ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(100, rep.percentage)}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-800 min-w-[45px]">
                            {rep.percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isRegular
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isAlert
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}>
                          {regularityLabel}
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

      {/* MANUAL ATTENDANCE MODAL BY DATE */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <Card className="w-full max-w-2xl shadow-2xl bg-white rounded-2xl my-auto max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-slate-100 p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Pase de Lista Docente por Fecha
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Modalidad: <span className="font-semibold text-slate-700">{currentCourseObj?.name} - {currentCourseObj?.level}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setIsManualModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Date Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                  <Label htmlFor="class-date-input" className="text-xs font-bold text-slate-700 shrink-0">
                    Fecha de la Clase:
                  </Label>
                  <Input
                    id="class-date-input"
                    type="date"
                    value={selectedClassDate}
                    onChange={(e) => setSelectedClassDate(e.target.value)}
                    className="h-8 text-xs font-semibold bg-white w-40"
                  />
                  {selectedClassDate === todayStr && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Hoy
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex items-center gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    disabled={manualLoading || dailyLoading}
                    onClick={() => handleRegisterAllForDate("Entrada")}
                  >
                    <Users className="h-3.5 w-3.5" /> Marcar Entrada a Todos hoy
                  </Button>
                </div>
              </div>

              {manualMessage && (
                <div className="p-3 text-xs text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{manualMessage}</span>
                </div>
              )}
              {manualError && (
                <div className="p-3 text-xs text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive flex items-center gap-2 animate-in fade-in">
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <span>{manualError}</span>
                </div>
              )}

              {/* Attendance Table by Date */}
              {dailyLoading ? (
                <div className="text-center py-8 text-slate-500 flex flex-col items-center justify-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="text-xs font-medium">Cargando estado del día {formatDateForDisplay(selectedClassDate)}...</p>
                </div>
              ) : dailyAttendances.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay alumnas matriculadas activas en este curso.
                </div>
              ) : (
                <Table className="min-w-[550px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="font-semibold text-slate-700">Estudiante</TableHead>
                      <TableHead className="font-semibold text-slate-700">C.I.</TableHead>
                      <TableHead className="text-center font-semibold text-slate-700">Estado el {formatDateForDisplay(selectedClassDate)}</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyAttendances.map((item) => (
                      <TableRow key={item.studentId} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-800 text-sm">
                          {item.studentName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {item.ci}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.isPresent ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Presente ({item.type})
                              </span>
                              {item.timestamp && (
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  {new Date(item.timestamp).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} | {item.method || "Manual"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="h-3 w-3 text-red-500" />
                              Ausente
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {item.isPresent && item.attendanceId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800 flex items-center gap-1"
                                disabled={manualLoading}
                                onClick={() => handleDeleteAttendance(item.attendanceId!, item.studentName)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Anular Asistencia
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-1"
                                disabled={manualLoading}
                                onClick={() => handleRegisterManualForDate(item.studentId, "Entrada", item.studentName)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> + Marcar Presente
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            <div className="border-t border-slate-100 p-4 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Info className="h-4 w-4 text-primary" />
                <span>Las modificaciones por fecha recalculan automáticamente la regularidad de la etapa.</span>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsManualModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
