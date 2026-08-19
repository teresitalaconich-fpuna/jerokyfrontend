"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../../components/ui/dialog";
import {
  getAcademicPeriods,
  getAcademicYears,
  createAcademicPeriod,
  updateAcademicPeriod,
  deleteAcademicPeriod,
  IAcademicPeriod,
  ensureAuth,
} from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth-context";
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
  CalendarDays,
  FolderPlus,
} from "lucide-react";

// Predefined quick suggestions to assist operators in filling dates and names rapidly
const QUICK_STAGE_PRESETS = [
  {
    name: "1ª Etapa",
    defaultStart: "02-01",
    defaultEnd: "06-30",
    color: "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  {
    name: "2ª Etapa",
    defaultStart: "07-01",
    defaultEnd: "10-31",
    color: "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  {
    name: "Examen Final",
    defaultStart: "11-01",
    defaultEnd: "11-30",
    color: "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100",
  },
  {
    name: "Recuperatorio",
    defaultStart: "12-01",
    defaultEnd: "12-15",
    color: "border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    name: "1er Semestre",
    defaultStart: "02-01",
    defaultEnd: "06-30",
    color: "border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  },
  {
    name: "2do Semestre",
    defaultStart: "07-01",
    defaultEnd: "11-30",
    color: "border-teal-500 bg-teal-50 text-teal-700 hover:bg-teal-100",
  },
];

function formatDateForDisplay(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function CalendarioPage() {
  const { user } = useAuth();
  const role = user?.role || null;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [knownYears, setKnownYears] = useState<number[]>([
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ]);
  const [periods, setPeriods] = useState<IAcademicPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createStartDate, setCreateStartDate] = useState(`${currentYear}-02-01`);
  const [createEndDate, setCreateEndDate] = useState(`${currentYear}-06-30`);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Modal State
  const [editingPeriod, setEditingPeriod] = useState<IAcademicPeriod | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Custom Year Modal State
  const [isCustomYearOpen, setIsCustomYearOpen] = useState(false);
  const [customYearInput, setCustomYearInput] = useState(String(currentYear));

  // Deleting State (tracking ID being deleted)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Load known years from DB
  const loadKnownYears = useCallback(async () => {
    try {
      await ensureAuth();
      const years = await getAcademicYears();
      if (Array.isArray(years) && years.length > 0) {
        const set = new Set([...years, currentYear - 1, currentYear, currentYear + 1]);
        setKnownYears(Array.from(set).sort((a, b) => a - b));
      }
    } catch {
      // Fallback
    }
  }, [currentYear]);

  // 2. Load periods for the selected year
  const loadPeriods = useCallback(async (year: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await ensureAuth();
      const data = await getAcademicPeriods(year);
      const items = Array.isArray(data) ? data : [];
      setPeriods(items);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar períodos académicos";
      setErrorMessage(msg);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadKnownYears();
      }
    });
    return () => {
      active = false;
    };
  }, [loadKnownYears]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadPeriods(selectedYear);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedYear, loadPeriods]);

  // Handle Quick Preset Click in Create Modal
  const handleApplyPreset = (preset: typeof QUICK_STAGE_PRESETS[0]) => {
    setCreateName(preset.name);
    setCreateStartDate(`${selectedYear}-${preset.defaultStart}`);
    setCreateEndDate(`${selectedYear}-${preset.defaultEnd}`);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setCreateName("");
    setCreateStartDate(`${selectedYear}-02-01`);
    setCreateEndDate(`${selectedYear}-06-30`);
    setIsCreateOpen(true);
    setErrorMessage(null);
  };

  // Submit Create Period
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setErrorMessage("Debe ingresar un nombre para el período");
      return;
    }
    if (!createStartDate || !createEndDate) {
      setErrorMessage("Debe ingresar fecha de inicio y fin");
      return;
    }
    if (createStartDate > createEndDate) {
      setErrorMessage("La fecha de inicio no puede ser posterior a la fecha de fin");
      return;
    }

    setCreateLoading(true);
    setErrorMessage(null);

    try {
      const created = await createAcademicPeriod({
        year: selectedYear,
        name: createName.trim(),
        startDate: createStartDate,
        endDate: createEndDate,
      });

      setSuccessMessage(`Período "${created.name}" creado con éxito para el año ${selectedYear}.`);
      setIsCreateOpen(false);
      
      // Update local state directly & refresh years
      setPeriods((prev) => {
        const filtered = prev.filter((p) => p.id !== created.id && p.name !== created.name);
        return [...filtered, created].sort((a, b) => a.startDate.localeCompare(b.startDate));
      });

      // Ensure this year is in knownYears
      setKnownYears((prev) => {
        if (!prev.includes(selectedYear)) {
          return [...prev, selectedYear].sort((a, b) => a - b);
        }
        return prev;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear el período";
      setErrorMessage(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (period: IAcademicPeriod) => {
    setEditingPeriod(period);
    setEditName(period.name);
    setEditStartDate(period.startDate);
    setEditEndDate(period.endDate);
    setErrorMessage(null);
  };

  // Submit Edit Period
  const handleUpdatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod) return;

    if (!editName.trim()) {
      setErrorMessage("El nombre del período no puede estar vacío");
      return;
    }
    if (!editStartDate || !editEndDate) {
      setErrorMessage("Debe ingresar fecha de inicio y fin");
      return;
    }
    if (editStartDate > editEndDate) {
      setErrorMessage("La fecha de inicio no puede ser posterior a la fecha de fin");
      return;
    }

    setEditLoading(true);
    setErrorMessage(null);

    try {
      const updated = await updateAcademicPeriod(editingPeriod.id, {
        name: editName.trim(),
        startDate: editStartDate,
        endDate: editEndDate,
      });

      setSuccessMessage(`Período "${updated.name}" actualizado correctamente.`);
      setEditingPeriod(null);

      // Update state directly
      setPeriods((prev) =>
        prev
          .map((p) => (p.id === updated.id ? updated : p))
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar el período";
      setErrorMessage(msg);
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Period
  const handleDeletePeriod = async (period: IAcademicPeriod) => {
    const confirmed = window.confirm(
      `¿Está seguro de eliminar el período "${period.name}" del año ${selectedYear}? Esta acción lo quitará inmediatamente.`
    );
    if (!confirmed) return;

    setDeletingId(period.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteAcademicPeriod(period.id);
      
      // Remove immediately from UI
      setPeriods((prev) => prev.filter((p) => p.id !== period.id));
      setSuccessMessage(`Período "${period.name}" eliminado correctamente.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Error al eliminar el período "${period.name}"`;
      setErrorMessage(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // Jump to custom year
  const handleApplyCustomYear = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseInt(customYearInput, 10);
    if (isNaN(y) || y < 2000 || y > 2100) {
      setErrorMessage("Ingrese un año válido entre 2000 y 2100.");
      return;
    }

    setSelectedYear(y);
    setKnownYears((prev) => {
      if (!prev.includes(y)) {
        return [...prev, y].sort((a, b) => a - b);
      }
      return prev;
    });
    setIsCustomYearOpen(false);
  };

  // Period Status calculation
  const getPeriodStatus = (startDate: string, endDate: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (today >= startDate && today <= endDate) {
      return {
        label: "En Curso (Activo)",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
        icon: CheckCircle2,
      };
    } else if (today < startDate) {
      return {
        label: "Próximo",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
        icon: Clock,
      };
    } else {
      return {
        label: "Finalizado",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
        icon: Check,
      };
    }
  };

  // Color generator for dynamic periods
  const getPeriodColorTheme = (index: number) => {
    const colors = [
      "border-blue-500 text-blue-700 bg-blue-50/70",
      "border-emerald-500 text-emerald-700 bg-emerald-50/70",
      "border-purple-500 text-purple-700 bg-purple-50/70",
      "border-amber-500 text-amber-700 bg-amber-50/70",
      "border-indigo-500 text-indigo-700 bg-indigo-50/70",
      "border-rose-500 text-rose-700 bg-rose-50/70",
    ];
    return colors[index % colors.length];
  };

  // RBAC Access Control Check
  const isAuthorized = role === "Administrator" || role === "Operador";
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white border border-slate-200 rounded-xl shadow-lg space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground">
          Esta sección está restringida únicamente para los roles de{" "}
          <strong className="font-semibold text-slate-700">Administrador</strong> y{" "}
          <strong className="font-semibold text-slate-700">Operador</strong>.
        </p>
      </div>
    );
  }

  const yearCategoryLabel =
    selectedYear === currentYear
      ? "Ciclo Lectivo Actual"
      : selectedYear < currentYear
      ? "Ciclo Lectivo Histórico"
      : "Ciclo Lectivo en Planificación";

  const yearBadgeColor =
    selectedYear === currentYear
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : selectedYear < currentYear
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : "bg-purple-100 text-purple-800 border-purple-200";

  return (
    <div className="space-y-6">
      {/* Top Header & Year Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">
                  Períodos Académicos
                </h1>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${yearBadgeColor}`}
                >
                  {yearCategoryLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Definición dinámica de fechas para el cálculo de asistencias y carga de calificaciones.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Year navigation + Create Period Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Step navigation */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedYear((prev) => prev - 1)}
              title="Año anterior"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <Select
              id="year-select"
              value={String(selectedYear)}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="h-8 text-xs font-bold bg-transparent border-0 shadow-none text-slate-800 focus:ring-0 w-36 cursor-pointer"
            >
              {knownYears.map((y) => {
                let note = "";
                if (y === currentYear) note = " (Actual)";
                else if (y < currentYear) note = " (Histórico)";
                else note = " (Futuro)";

                return (
                  <option key={y} value={y}>
                    Año {y}
                    {note}
                  </option>
                );
              })}
            </Select>

            <button
              onClick={() => setSelectedYear((prev) => prev + 1)}
              title="Año siguiente"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Jump to other year */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomYearInput(String(selectedYear));
              setIsCustomYearOpen(true);
            }}
            className="h-9 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
          >
            Otro Año...
          </Button>

          {/* Create Period Button */}
          <Button
            onClick={handleOpenCreate}
            className="h-9 text-xs flex items-center gap-1.5 font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuevo Período
          </Button>
        </div>
      </div>

      {/* Toast / Status Notifications */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 text-destructive text-sm rounded-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-destructive hover:opacity-80 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Year Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Ciclo Activo</p>
            <p className="text-base font-bold text-slate-800">Año {selectedYear}</p>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Períodos Registrados</p>
            <p className="text-base font-bold text-slate-800">
              {periods.length} {periods.length === 1 ? "período definido" : "períodos definidos"}
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Uso en el Sistema</p>
            <p className="text-xs font-semibold text-slate-700">
              Filtro temporal para asistencias y calificaciones
            </p>
          </div>
        </Card>
      </div>

      {/* Period Cards Grid or Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground font-semibold">
            Cargando períodos del año {selectedYear}...
          </p>
        </div>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-4">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
            <FolderPlus className="h-10 w-10 text-primary/60" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-slate-800">
              No hay períodos definidos para el ciclo lectivo {selectedYear}
            </h3>
            <p className="text-xs text-muted-foreground">
              Define libremente los períodos o etapas de evaluación que correspondan a este año. Se utilizarán para calcular el porcentaje de asistencia y cargar notas.
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            Crear Primer Período para {selectedYear}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {periods.map((period, idx) => {
            const status = getPeriodStatus(period.startDate, period.endDate);
            const StatusIcon = status.icon;
            const colorTheme = getPeriodColorTheme(idx);
            const isDeleting = deletingId === period.id;

            return (
              <Card
                key={period.id}
                className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold border ${colorTheme}`}
                        >
                          {period.name}
                        </span>
                        <CardTitle className="text-base font-bold text-slate-800 pt-1">
                          {period.name}
                        </CardTitle>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${status.badgeClass}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Inicio:</span>
                        <span className="font-bold text-slate-800">
                          {formatDateForDisplay(period.startDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Fin:</span>
                        <span className="font-bold text-slate-800">
                          {formatDateForDisplay(period.endDate)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-2 pb-3 px-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                  <Button
                    onClick={() => handleOpenEdit(period)}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDeletePeriod(period)}
                    disabled={isDeleting}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30 flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeleting ? "Borrando..." : "Eliminar"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE PERIOD DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreatePeriod} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Nuevo Período para el Año {selectedYear}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Escriba el nombre del período o use un atajo rápido.
              </DialogDescription>
            </DialogHeader>

            {/* Quick preset chips */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">
                Plantillas y nombres rápidos:
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_STAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${preset.color}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs font-semibold text-slate-700">
                  Nombre del Período *
                </Label>
                <Input
                  id="create-name"
                  type="text"
                  placeholder="ej. 1ª Etapa, Primer Semestre, etc."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-start" className="text-xs font-semibold text-slate-700">
                    Fecha de Inicio *
                  </Label>
                  <Input
                    id="create-start"
                    type="date"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                    className="text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-end" className="text-xs font-semibold text-slate-700">
                    Fecha de Fin *
                  </Label>
                  <Input
                    id="create-end"
                    type="date"
                    value={createEndDate}
                    onChange={(e) => setCreateEndDate(e.target.value)}
                    className="text-xs font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="text-xs font-semibold"
              >
                {createLoading ? "Guardando..." : "Guardar Período"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PERIOD DIALOG */}
      <Dialog
        open={Boolean(editingPeriod)}
        onOpenChange={(open) => {
          if (!open) setEditingPeriod(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdatePeriod} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                Editar Período ({selectedYear})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Modifique el nombre o las fechas de este período.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold text-slate-700">
                  Nombre del Período *
                </Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-start" className="text-xs font-semibold text-slate-700">
                    Fecha de Inicio *
                  </Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-end" className="text-xs font-semibold text-slate-700">
                    Fecha de Fin *
                  </Label>
                  <Input
                    id="edit-end"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="text-xs font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPeriod(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="text-xs font-semibold"
              >
                {editLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* JUMP TO CUSTOM YEAR DIALOG */}
      <Dialog open={isCustomYearOpen} onOpenChange={setIsCustomYearOpen}>
        <DialogContent className="sm:max-w-xs">
          <form onSubmit={handleApplyCustomYear} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Ir a un Año Específico
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Consulte o planifique períodos para cualquier ciclo lectivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="custom-year-input" className="text-xs font-semibold text-slate-700">
                Año (2000 - 2100):
              </Label>
              <Input
                id="custom-year-input"
                type="number"
                min={2000}
                max={2100}
                value={customYearInput}
                onChange={(e) => setCustomYearInput(e.target.value)}
                className="text-sm font-bold text-center"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomYearOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" className="text-xs font-semibold">
                Navegar al Año
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
