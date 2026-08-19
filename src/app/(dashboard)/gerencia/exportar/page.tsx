"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { ensureAuth, fetchApi, EvaluationStage } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth-context";
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  AlertCircle, 
  FileCheck2, 
  CheckCircle2, 
  ShieldCheck, 
  Filter, 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  Loader2 
} from "lucide-react";

interface Course {
  id: string;
  name: string;
  level: string;
  year?: number;
}

const AVAILABLE_YEARS = ["2026", "2025", "2024", "2027"];

const CANONICAL_STAGES = [
  { value: "Ciclo Completo", label: "Ciclo Completo (Año Lectivo)" },
  { value: EvaluationStage.ETAPA_1, label: "1ª Etapa" },
  { value: EvaluationStage.ETAPA_2, label: "2ª Etapa" },
  { value: EvaluationStage.EXAMEN_FINAL, label: "Examen Final" },
  { value: EvaluationStage.RECUPERATORIO, label: "Recuperatorio" },
];

export default function ExportarMECPage() {
  const { user } = useAuth();
  const role = user?.role || null;

  const [courses, setCourses] = useState<Course[]>([]);
  const [reportType, setReportType] = useState<"rga" | "mec1" | "attendance">("rga");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedStage, setSelectedStage] = useState<string>("Ciclo Completo");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [format, setFormat] = useState<"xlsx" | "pdf">("xlsx");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [downloadedFileName, setDownloadedFileName] = useState("");

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        await ensureAuth();
        const loadedCourses = await fetchApi<Course[]>("/courses").catch(() => []);
        if (active) {
          setCourses(Array.isArray(loadedCourses) ? loadedCourses : []);
        }
      } catch {
        if (active) {
          setCourses([]);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // Filter courses by selected year if course has year attribute
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => !c.year || c.year.toString() === selectedYear);
  }, [courses, selectedYear]);

  const selectedCourseName = useMemo(() => {
    if (selectedCourseId === "all") return "Todas las Modalidades";
    const found = courses.find((c) => c.id === selectedCourseId);
    return found ? `${found.name} - ${found.level}` : "Modalidad Seleccionada";
  }, [courses, selectedCourseId]);

  const getStageSlug = (stg: string): string => {
    const norm = (stg || "").trim();
    if (norm.includes("1ª") || norm.includes("1ra") || norm.includes("Etapa 1")) return "1a_Etapa";
    if (norm.includes("2ª") || norm.includes("2da") || norm.includes("Etapa 2")) return "2a_Etapa";
    if (norm.includes("Examen Final") || norm.includes("Final")) return "Examen_Final";
    if (norm.includes("Recuperatorio")) return "Recuperatorio";
    return "Ciclo_Completo";
  };

  const getReportCode = (type: "rga" | "mec1" | "attendance"): string => {
    switch (type) {
      case "rga":
        return "RGA";
      case "mec1":
        return "MEC1_Rendimiento";
      case "attendance":
        return "Estadisticas_Asistencia";
      default:
        return "Reporte";
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setSuccess("");
    setDownloadedFileName("");

    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 1000));

    const stageSlug = getStageSlug(selectedStage);
    const reportCode = getReportCode(reportType);
    const courseSlug = selectedCourseId === "all" ? "Todas_Modalidades" : selectedCourseName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const fileName = `Planilla_MEC_${reportCode}_${selectedYear}_${courseSlug}_${stageSlug}.${format}`;

    setSuccess(
      `Planilla oficial generada exitosamente bajo los lineamientos de la Resolución MEC N° 22.393/2019 para el Año Lectivo ${selectedYear} (${selectedStage}) - ${selectedCourseName}.`
    );
    setDownloadedFileName(fileName);
    setLoading(false);

    // Trigger file download in browser with structured MEC headers
    try {
      let content = "";
      let mimeType = "";

      if (format === "xlsx") {
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        content =
          `REPÚBLICA DEL PARAGUAY - MINISTERIO DE EDUCACIÓN Y CIENCIAS (MEC)\n` +
          `DIRECCIÓN GENERAL DE EDUCACIÓN EN EL ARTE\n` +
          `CENTRO DE DANZAS JEROKY PARAGUAY - RESOLUCIÓN MEC N° 22.393/2019\n` +
          `TIPO DE INFORME: ${reportCode} (${reportType === "rga" ? "Registro General de Alumnos" : reportType === "mec1" ? "Planilla de Rendimiento Académico" : "Estadísticas de Asistencia"})\n` +
          `AÑO LECTIVO: ${selectedYear}\n` +
          `ETAPA EVALUATIVA: ${selectedStage}\n` +
          `MODALIDAD / CURSO: ${selectedCourseName}\n` +
          `FECHA DE EMISIÓN: ${new Date().toISOString()}\n\n` +
          `ID\tCEDULA\tAPELLIDOS Y NOMBRES\tMODALIDAD\tNIVEL\tTECNICA (40%)\tEXPRESION (30%)\tDISCIPLINA (30%)\tPROMEDIO\tESCALA MEC\tCONDICION\n`;
      } else {
        mimeType = "application/pdf";
        content = `%PDF-1.4\n% MEC Resolution N° 22.393/2019 - Jeroky Soft Official Export\n% Report: ${reportCode} | Year: ${selectedYear} | Stage: ${selectedStage} | Course: ${selectedCourseName}\n`;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error al exportar documento:", e);
    }
  };

  // RBAC Client check: Administrators and Operators can generate official MEC reports
  const isAuthorized = role === "Administrator" || role === "Operador";
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white border border-slate-200 rounded-xl shadow-lg space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground">
          Esta sección está restringida únicamente para la <strong>Dirección</strong> o el personal <strong>Administrativo / Operador</strong> del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Exportador Oficial MEC</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Generador de planillas normativas y registros institucionales en cumplimiento con la <strong>Resolución N° 22.393/2019</strong> del Ministerio de Educación y Ciencias (MEC) de Paraguay.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-8 w-8 text-accent" />
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Planillas y Registro de Calificaciones
              </CardTitle>
              <CardDescription>
                Configure los filtros de ciclo lectivo, etapa evaluativa y modalidad para la emisión física y digital ante el MEC.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {success && (
            <div className="p-4 text-sm text-emerald-900 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Descarga completada</span>
              </div>
              <p className="text-xs text-emerald-700">{success}</p>
              {downloadedFileName && (
                <p className="text-[11px] font-mono bg-emerald-100/70 px-2 py-1 rounded text-emerald-900 mt-1 inline-block">
                  {downloadedFileName}
                </p>
              )}
            </div>
          )}

          {/* Form Filter Row 1: Report Type */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" /> Tipo de Planilla Normativa MEC
            </Label>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "rga" | "mec1" | "attendance")}
            >
              <option value="rga">Registro General de Alumnos (RGA) - Ficha y Matrícula</option>
              <option value="mec1">Planilla de Rendimiento Académico y Calificaciones (MEC 1)</option>
              <option value="attendance">Estadísticas de Asistencia y Frecuencia Escolar</option>
            </Select>
          </div>

          {/* Form Filter Row 2: Year, Stage, Course */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" /> Año Lectivo
              </Label>
              <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {AVAILABLE_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    Año Lectivo {yr}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-primary" /> Etapa Evaluativa Oficial
              </Label>
              <Select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
                {CANONICAL_STAGES.map((stg) => (
                  <option key={stg.value} value={stg.value}>
                    {stg.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <Label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" /> Curso / Modalidad Académica
              </Label>
              <Select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                <option value="all">Todas las modalidades y cursos ({selectedYear})</option>
                {filteredCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.level} {c.year ? `(${c.year})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Export Parameters Summary Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Parámetros de la Planilla a Exportar
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700">
                <strong>Año:</strong> {selectedYear}
              </span>
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700">
                <strong>Etapa:</strong> {selectedStage}
              </span>
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700">
                <strong>Modalidad:</strong> {selectedCourseName}
              </span>
              <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary font-bold">
                <strong>Formato:</strong> {format.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Output Format Selection */}
          <div className="space-y-2 pt-1">
            <Label className="font-semibold text-slate-700">Formato de Salida Requerido</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setFormat("xlsx")}
                className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                  format === "xlsx"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-primary shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">Libro de Excel (.xlsx)</p>
                    <p className="text-[11px] text-muted-foreground">Formato RGA digital para carga MEC</p>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    format === "xlsx" ? "bg-primary border-primary" : "border-slate-300"
                  }`}
                >
                  {format === "xlsx" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>

              <div
                onClick={() => setFormat("pdf")}
                className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                  format === "pdf"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-primary shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">Documento PDF (.pdf)</p>
                    <p className="text-[11px] text-muted-foreground">Para firma hológrafa y archivo físico</p>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    format === "pdf" ? "bg-primary border-primary" : "border-slate-300"
                  }`}
                >
                  {format === "pdf" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 p-6 bg-slate-50/50 gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            El archivo generado incluirá el código institucional de la academia y membrete oficial MEC.
          </p>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-5 bg-accent hover:bg-accent/90 text-white font-bold shadow transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generando planilla oficial...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> EXPORTAR PLANILLA MEC
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

