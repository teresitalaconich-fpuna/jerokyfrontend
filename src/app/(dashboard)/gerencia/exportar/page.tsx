"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { ensureAuth } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth-context";
import { FileSpreadsheet, FileText, Download, AlertCircle, FileCheck2 } from "lucide-react";

export default function ExportarMECPage() {
  const { user } = useAuth();
  const role = user?.role || null;
  const [reportType, setReportType] = useState("general");
  const [format, setFormat] = useState("xlsx");
  const [period, setPeriod] = useState("2026");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    ensureAuth();
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setSuccess("");
    
    // Simulate generation delay
    await new Promise(r => setTimeout(r, 2000));
    
    setSuccess(`Informe generado exitosamente bajo las directivas de la Resolución MEC N° 22.393/2019 en formato .${format.toUpperCase()}`);
    setLoading(false);

    // Trigger a mock file download in browser
    try {
      const dummyContent = "MEC Resolution N° 22.393/2019 Export Data - Jeroky Soft";
      const blob = new Blob([dummyContent], { type: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Planilla_MEC_${reportType}_${period}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  // RBAC Client check
  const isAuthorized = role === "Administrator" || role === "Director";
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Exportador MEC</h1>
        <p className="text-sm text-muted-foreground">
          Generador de planillas normativas en cumplimiento con la **Resolución N° 22.393/2019** del Ministerio de Educación y Ciencias (MEC) de Paraguay.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-8 w-8 text-accent" />
            <div>
              <CardTitle>Planillas y Registro de Calificaciones</CardTitle>
              <CardDescription>
                Configure el formato requerido para su envío físico y digital al supervisor de zona del MEC.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && (
            <div className="p-3 text-sm text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-200">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo de Planilla Normativa</Label>
              <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="general">Registro General de Alumnos (RGA)</option>
                <option value="grades">Planilla de Rendimiento Académico (MEC 1)</option>
                <option value="attendance">Estadísticas de Asistencia y Frecuencia</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Periodo de Lectura</Label>
              <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="2026">Año Lectivo 2026</option>
                <option value="2025">Año Lectivo 2025</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formato de Salida Obligatorio</Label>
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setFormat("xlsx")}
                className={`p-4 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                  format === "xlsx" 
                    ? "border-primary bg-primary/5 text-primary shadow" 
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-bold text-sm">Libro de Excel (.xlsx)</p>
                    <p className="text-[10px] text-muted-foreground">Formato oficial RGA matriculados</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${format === 'xlsx' ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                  {format === 'xlsx' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>

              <div 
                onClick={() => setFormat("pdf")}
                className={`p-4 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                  format === "pdf" 
                    ? "border-primary bg-primary/5 text-primary shadow" 
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-bold text-sm">Documento PDF (.pdf)</p>
                    <p className="text-[10px] text-muted-foreground">Para firma hológrafa y archivo físico</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${format === 'pdf' ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                  {format === 'pdf' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-slate-100 pt-6">
          <Button 
            onClick={handleExport} 
            disabled={loading}
            className="flex items-center gap-2 px-8 py-5 bg-accent hover:bg-accent/90 text-white font-bold"
          >
            <Download className="h-5 w-5" />
            {loading ? "Generando planilla..." : "EXPORTAR PLANILLA"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
