"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { fetchApi, ensureAuth } from "../../../lib/api";
import {
  Plus,
  Trash2,
  Calendar,
  MapPin,
  User,
  Users,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Clock,
  Edit2,
  X,
  GraduationCap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Teacher {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface CourseSchedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classroom: string;
}

interface Course {
  id: string;
  name: string;
  level: string;
  capacity: number;
  year: number;
  classCode: string | null;
  schedules: CourseSchedule[];
  teacher?: Teacher | null;
}

interface ScheduleRow {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classroom: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODALITIES = [
  "Ballet Clásico",
  "Danza Paraguaya",
  "Jazz",
  "Danza Contemporánea",
  "Danza Española",
  "Folklore",
];
const LEVELS = [
  "Nivel Inicial / Infantil",
  "Nivel Principiante",
  "Nivel Intermedio",
  "Nivel Avanzado",
  "Técnica de Puntas",
];
const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00",
];
const CLASSROOMS = ["Aula Principal", "Aula A", "Aula B", "Aula C", "Salón Auxiliar"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const MODALITY_COLORS: Record<string, string> = {
  "Ballet Clásico": "from-pink-500 to-rose-500",
  "Danza Paraguaya": "from-red-500 to-orange-500",
  "Jazz": "from-purple-500 to-violet-500",
  "Danza Contemporánea": "from-blue-500 to-cyan-500",
  "Danza Española": "from-amber-500 to-yellow-500",
  "Folklore": "from-green-500 to-emerald-500",
};

function getModalityColor(name: string): string {
  for (const key of Object.keys(MODALITY_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase().split(" ")[0])) {
      return MODALITY_COLORS[key];
    }
  }
  return "from-slate-500 to-slate-600";
}

const emptyScheduleRow = (): ScheduleRow => ({
  dayOfWeek: "Lunes",
  startTime: "16:00",
  endTime: "17:30",
  classroom: "Aula Principal",
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function OfertaAcademicaPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Editing state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form fields — Master
  const [modality, setModality] = useState(MODALITIES[0]);
  const [customModality, setCustomModality] = useState("");
  const [level, setLevel] = useState(LEVELS[0]);
  const [customLevel, setCustomLevel] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [capacity, setCapacity] = useState(20);

  // Form fields — Detail (schedule rows)
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([emptyScheduleRow()]);

  // Visualizer filter
  const [filterDay, setFilterDay] = useState("Lunes");

  // ── Data Loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await ensureAuth();
      const loadedCourses = await fetchApi<Course[]>("/courses");
      const loadedUsers = await fetchApi<Teacher[]>("/users");

      setCourses(loadedCourses);
      const filteredTeachers = loadedUsers.filter(
        (u) => u.role === "Docente" || u.role === "Administrator"
      );
      setTeachers(filteredTeachers);
      if (filteredTeachers.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(filteredTeachers[0].id);
      }
    } catch (err) {
      console.warn("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) loadData(); });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived Values ──────────────────────────────────────────────────────────

  const getFinalModality = () => (modality === "Otra" ? customModality : modality);
  const getFinalLevel = () => (level === "Otro" ? customLevel : level);

  const generateClassCode = (name: string, lev: string, yr: number) => {
    const acronym = (str: string) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.substring(0, 3).toUpperCase())
        .join("-");
    return `${acronym(name)}-${acronym(lev)}-${yr}`;
  };

  const previewCode = generateClassCode(getFinalModality(), getFinalLevel(), selectedYear);

  // ── Schedule Row Management ─────────────────────────────────────────────────

  const addScheduleRow = () => setScheduleRows((r) => [...r, emptyScheduleRow()]);

  const removeScheduleRow = (idx: number) =>
    setScheduleRows((r) => r.filter((_, i) => i !== idx));

  const updateScheduleRow = (idx: number, field: keyof ScheduleRow, value: string) =>
    setScheduleRows((rows) =>
      rows.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );

  // ── Form Reset / Load for Edit ───────────────────────────────────────────────

  const resetForm = () => {
    setEditingCourse(null);
    setModality(MODALITIES[0]);
    setCustomModality("");
    setLevel(LEVELS[0]);
    setCustomLevel("");
    setSelectedYear(CURRENT_YEAR);
    setCapacity(20);
    setScheduleRows([emptyScheduleRow()]);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const startEditing = (course: Course) => {
    setEditingCourse(course);
    setModality(MODALITIES.includes(course.name) ? course.name : "Otra");
    setCustomModality(MODALITIES.includes(course.name) ? "" : course.name);
    setLevel(LEVELS.includes(course.level) ? course.level : "Otro");
    setCustomLevel(LEVELS.includes(course.level) ? "" : course.level);
    setSelectedTeacherId(course.teacher?.id ?? "");
    setSelectedYear(course.year);
    setCapacity(course.capacity);
    setScheduleRows(
      course.schedules.length > 0
        ? course.schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            classroom: s.classroom,
          }))
        : [emptyScheduleRow()]
    );
    setErrorMsg("");
    setSuccessMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit (Create / Update) ─────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalModality = getFinalModality().trim();
    const finalLevel = getFinalLevel().trim();

    if (!finalModality || !finalLevel) {
      setErrorMsg("Debe completar la modalidad y el nivel.");
      return;
    }
    if (scheduleRows.length === 0) {
      setErrorMsg("Debe agregar al menos un horario.");
      return;
    }
    for (const row of scheduleRows) {
      if (!row.dayOfWeek || !row.startTime || !row.endTime || !row.classroom) {
        setErrorMsg("Todos los campos de horario son obligatorios.");
        return;
      }
    }

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      name: finalModality,
      level: finalLevel,
      capacity: Number(capacity),
      year: selectedYear,
      teacherId: selectedTeacherId || undefined,
      schedules: scheduleRows,
    };

    try {
      if (editingCourse) {
        await fetchApi(`/courses/${editingCourse.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Curso "${finalModality} (${finalLevel})" actualizado exitosamente.`);
      } else {
        await fetchApi("/courses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Curso "${finalModality} (${finalLevel})" creado exitosamente.`);
      }
      await loadData();
      resetForm();
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || "Error al guardar el curso.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (course: Course) => {
    if (!confirm(`¿Eliminar "${course.name} (${course.level})"?\nEsta acción eliminará el curso y todos sus registros de asistencia asociados.`)) return;
    try {
      await fetchApi(`/courses/${course.id}`, { method: "DELETE" });
      setSuccessMsg(`Curso "${course.name}" eliminado.`);
      await loadData();
      if (editingCourse?.id === course.id) resetForm();
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || "Error al eliminar el curso.");
    }
  };

  // ── Visualizer Filtering ────────────────────────────────────────────────────

  const coursesForDay = courses.filter((c) =>
    c.schedules.some((s) => s.dayOfWeek === filterDay)
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Oferta Académica</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure los cursos con sus modalidades, niveles, docentes y horarios por día.
          </p>
        </div>
        {editingCourse && (
          <Button variant="outline" onClick={resetForm} className="flex items-center gap-2">
            <X className="h-4 w-4" /> Cancelar edición
          </Button>
        )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div><p className="font-bold">Error</p><p>{errorMsg}</p></div>
        </div>
      )}
      {successMsg && (
        <div className="p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div><p className="font-bold">Operación exitosa</p><p>{successMsg}</p></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: Form (Master + Detail) ── */}
        <Card className={`lg:col-span-2 border shadow-lg rounded-xl h-fit ${editingCourse ? "border-amber-300 ring-2 ring-amber-200" : "border-slate-200"}`}>
          <CardHeader className={`border-b pb-4 ${editingCourse ? "bg-amber-50/60" : "bg-slate-50/50"}`}>
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              {editingCourse
                ? <><Edit2 className="h-5 w-5 text-amber-600" /> Editar Curso</>
                : <><Plus className="h-5 w-5 text-primary" /> Nuevo Curso</>}
            </CardTitle>
            <CardDescription>
              {editingCourse
                ? `Editando: ${editingCourse.name} (${editingCourse.level})`
                : "Complete los datos del maestro y agregue sus horarios (días)."}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-6">

              {/* ── MASTER DATA ── */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Datos del Curso</p>
              </div>

              {/* Modality */}
              <div className="space-y-1">
                <Label htmlFor="modality">Modalidad / Disciplina *</Label>
                <Select value={modality} onChange={(e) => setModality(e.target.value)}>
                  {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
                  <option value="Otra">Otra modalidad...</option>
                </Select>
                {modality === "Otra" && (
                  <Input
                    placeholder="Ej. Danza Española"
                    value={customModality}
                    onChange={(e) => setCustomModality(e.target.value)}
                    className="mt-2"
                    required
                  />
                )}
              </div>

              {/* Level */}
              <div className="space-y-1">
                <Label htmlFor="level">Nivel / Curso *</Label>
                <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  <option value="Otro">Otro nivel...</option>
                </Select>
                {level === "Otro" && (
                  <Input
                    placeholder="Ej. Preparatorio I"
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value)}
                    className="mt-2"
                    required
                  />
                )}
              </div>

              {/* Teacher, Year, Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Año Lectivo</Label>
                  <Select value={String(selectedYear)} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Capacidad *</Label>
                  <Input
                    type="number" min={1} max={100}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Docente Asignado</Label>
                <Select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                  <option value="">Sin asignar / Por definir</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.role})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Class Code Preview */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Código de Clase Generado</p>
                <p className="text-xs font-mono font-bold text-slate-700 mt-1 break-all bg-white p-2 border border-slate-100 rounded select-all">
                  {previewCode || "(Complete los campos arriba)"}
                </p>
              </div>

              {/* ── DETAIL: SCHEDULE ROWS ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Horarios del Curso ({scheduleRows.length})
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addScheduleRow}
                    className="text-xs h-7 px-2 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Agregar Día
                  </Button>
                </div>

                <div className="space-y-3">
                  {scheduleRows.map((row, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Horario {idx + 1}</span>
                        {scheduleRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeScheduleRow(idx)}
                            className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 col-span-2">
                          <Label className="text-[11px]">Día</Label>
                          <Select
                            value={row.dayOfWeek}
                            onChange={(e) => updateScheduleRow(idx, "dayOfWeek", e.target.value)}
                          >
                            {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Hora Inicio</Label>
                          <Select
                            value={row.startTime}
                            onChange={(e) => updateScheduleRow(idx, "startTime", e.target.value)}
                          >
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Hora Fin</Label>
                          <Select
                            value={row.endTime}
                            onChange={(e) => updateScheduleRow(idx, "endTime", e.target.value)}
                          >
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </Select>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-[11px]">Aula</Label>
                          <Select
                            value={row.classroom}
                            onChange={(e) => updateScheduleRow(idx, "classroom", e.target.value)}
                          >
                            {CLASSROOMS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={actionLoading} className="w-full font-bold">
                {actionLoading
                  ? (editingCourse ? "Actualizando..." : "Creando...")
                  : (editingCourse ? "ACTUALIZAR CURSO" : "CREAR CURSO")}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* ── RIGHT: Weekly Visualizer ── */}
        <Card className="lg:col-span-3 border border-slate-200 shadow-lg rounded-xl flex flex-col overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
              <Calendar className="h-5 w-5 text-primary" /> Visualizador de Horarios Semanales
            </CardTitle>
            <CardDescription>
              {courses.length} curso{courses.length !== 1 ? "s" : ""} configurado{courses.length !== 1 ? "s" : ""} en total. Filtre por día.
            </CardDescription>
          </CardHeader>

          {/* Day tabs */}
          <div className="bg-slate-50 p-2 border-b border-slate-100 flex gap-1 overflow-x-auto">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDay(d)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex-shrink-0 ${
                  filterDay === d
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <CardContent className="flex-1 p-6 bg-slate-50/30 overflow-y-auto max-h-[700px]">
            {loading ? (
              <div className="py-20 text-center text-slate-500 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm font-semibold">Cargando oferta académica...</p>
              </div>
            ) : coursesForDay.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2 border-2 border-dashed border-slate-200 rounded-xl bg-white p-6">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">No hay clases para el día {filterDay}</p>
                <p className="text-xs text-muted-foreground">Use el formulario para agregar un horario en este día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {coursesForDay.map((c) => {
                  const daySchedules = c.schedules.filter((s) => s.dayOfWeek === filterDay);
                  const gradient = getModalityColor(c.name);

                  return (
                    <Card
                      key={c.id}
                      className={`border border-slate-100 bg-white relative overflow-hidden hover:shadow-md transition-all ${editingCourse?.id === c.id ? "ring-2 ring-amber-300" : ""}`}
                    >
                      {/* Top accent bar */}
                      <div className={`h-1.5 bg-gradient-to-r ${gradient} w-full absolute top-0 left-0`} />

                      <CardContent className="p-4 pt-5">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            {/* Header */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center`}>
                                <GraduationCap className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-base leading-tight">{c.name}</h4>
                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded uppercase mt-0.5">
                                  {c.level}
                                </span>
                              </div>
                            </div>

                            {/* Schedule rows for this day */}
                            <div className="space-y-1.5 mb-3">
                              {daySchedules.map((s, i) => (
                                <div key={i} className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    {s.startTime} – {s.endTime}
                                  </span>
                                  <span className="flex items-center gap-1 font-semibold">
                                    <MapPin className="h-3.5 w-3.5 text-accent" />
                                    {s.classroom}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Teacher & Capacity */}
                            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                              <span className="flex items-center gap-1 font-semibold">
                                <User className="h-3.5 w-3.5 text-emerald-600" />
                                {c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "Docente por asignar"}
                              </span>
                              <span className="flex items-center gap-1 font-semibold">
                                <Users className="h-3.5 w-3.5 text-slate-500" />
                                {c.capacity} vacantes · {c.year}
                              </span>
                            </div>

                            {/* classCode */}
                            <div className="mt-3 border-t border-slate-100 pt-2">
                              <p className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase">Código Único</p>
                              <p className="font-mono text-[10px] text-slate-500 font-bold select-all bg-slate-50 p-1.5 border border-slate-100 rounded mt-0.5">
                                {c.classCode || "—"}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(c)}
                              className="h-8 px-3 text-xs flex items-center gap-1 border-slate-200"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(c)}
                              className="h-8 px-3 text-xs flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
