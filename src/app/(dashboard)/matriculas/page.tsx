"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Pagination } from "../../../components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../components/ui/dialog";
import { fetchApi, ensureAuth } from "../../../lib/api";
import { 
  Search, 
  Trash2, 
  RefreshCw, 
  Printer, 
  Receipt, 
  AlertTriangle, 
  CheckCircle,
  X,
  User,
  Layers,
  Calendar,
  MapPin,
  Check,
  ChevronRight,
  Clock,
  GraduationCap
} from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  user?: {
    isActive: boolean;
  } | null;
  tutor?: {
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
}

interface Teacher {
  id: string;
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

interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: string; // active, inactive, transferred
  student: Student;
  course: Course;
  createdAt: string;
}

const formatCourseSchedules = (course: Course) => {
  if (!course.schedules || course.schedules.length === 0) return "Sin horarios";
  return course.schedules.map(s => `${s.dayOfWeek} ${s.startTime}-${s.endTime} (${s.classroom})`).join(", ");
};

export default function MatriculasPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Student selection state (Autocomplete Search)
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Cart selection state
  const [cart, setCart] = useState<Course[]>([]);

  // Transfer modal state
  const [enrollmentToTransfer, setEnrollmentToTransfer] = useState<Enrollment | null>(null);
  const [transferCourseId, setTransferCourseId] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Receipt Modal state
  const [receiptEnrollment, setReceiptEnrollment] = useState<Enrollment | null>(null);
  const [bulkReceiptEnrollments, setBulkReceiptEnrollments] = useState<Enrollment[]>([]);

  // Search filter and pagination for historical registrations log at the bottom
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const loadData = React.useCallback(async () => {
    try {
      await ensureAuth();
      const loadedStudents = await fetchApi<Student[]>("/students");
      const loadedCourses = await fetchApi<Course[]>("/courses");
      const loadedEnrollments = await fetchApi<Enrollment[]>("/students/info/enrollments");

      setStudents(Array.isArray(loadedStudents) ? loadedStudents : []);
      setCourses(Array.isArray(loadedCourses) ? loadedCourses : []);
      setEnrollments(Array.isArray(loadedEnrollments) ? loadedEnrollments : []);
    } catch (err) {
      console.error("Failed to load matriculas data:", err);
      setStudents([]);
      setCourses([]);
      setEnrollments([]);
    }
  }, []);

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

  // Autocomplete student filter (Active only)
  const filteredStudentSuggestions = students.filter(s => {
    const isActive = !s.user || s.user.isActive;
    if (!isActive) return false;

    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const query = studentSearchQuery.toLowerCase();
    return fullName.includes(query) || s.ci.includes(query);
  });

  // Calculate active enrollment count for a class
  const getActiveEnrollmentsCount = (courseId: string) => {
    return enrollments.filter(e => e.courseId === courseId && e.status === "active").length;
  };

  // Add course to checkout cart
  const addToCart = (course: Course) => {
    if (!selectedStudent) return;
    if (cart.find(item => item.id === course.id)) return;

    // Check duplicate modality (course.name) in the selected list for the same year
    const duplicateModalityInCart = cart.find(item => item.name === course.name && item.year === course.year);
    if (duplicateModalityInCart) {
      setErrorMsg(`Ya has seleccionado una clase de la modalidad "${course.name}" (${course.year}) en tu selección de matrícula.`);
      return;
    }

    // Check duplicate modality in active student enrollments for the same year
    const activeStudentEnrollments = enrollments.filter(e => e.studentId === selectedStudent.id && e.status === "active");
    const duplicateModalityInEnrollments = activeStudentEnrollments.find(e => e.course?.name === course.name && e.course?.year === course.year);
    if (duplicateModalityInEnrollments) {
      setErrorMsg(`El alumno ya se encuentra matriculado de forma activa en la modalidad "${course.name}" para el año lectivo ${course.year}.`);
      return;
    }

    setErrorMsg("");
    setCart(prev => [...prev, course]);
  };

  // Remove course from cart
  const removeFromCart = (courseId: string) => {
    setCart(prev => prev.filter(c => c.id !== courseId));
  };

  // Confirm and checkout enrollments
  const handleCheckoutEnrollment = async () => {
    if (!selectedStudent || cart.length === 0) {
      setErrorMsg("Debe seleccionar un alumno y al menos un curso");
      return;
    }

    setCheckoutLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const successfulEnrollments: Enrollment[] = [];
    const failures: string[] = [];

    // Loop through cart items and enroll sequentially
    for (const course of cart) {
      try {
        const res = await fetchApi<Enrollment>("/students/enroll", {
          method: "POST",
          body: JSON.stringify({
            studentId: selectedStudent.id,
            courseId: course.id,
          }),
        });
        successfulEnrollments.push(res);
      } catch (err) {
        const error = err as Error;
        failures.push(`${course.name} (${course.level}): ${error.message}`);
      }
    }

    if (failures.length > 0) {
      setErrorMsg(`Algunas inscripciones fallaron: ${failures.join(". ")}`);
    }

    if (successfulEnrollments.length > 0) {
      setSuccessMsg(`Se registraron con éxito ${successfulEnrollments.length} matrículas para ${selectedStudent.firstName}.`);
      
      // Load updated enrollments
      await loadData();

      // Open receipt viewer for the newly generated enrollments
      setBulkReceiptEnrollments(successfulEnrollments);
      
      // Clear selection cart
      setCart([]);
      setSelectedStudent(null);
      setStudentSearchQuery("");
    }

    setCheckoutLoading(false);
  };

  // Drop registration
  const handleDrop = async (id: string) => {
    if (!confirm("¿Está seguro que desea dar de baja esta matrícula? Esto liberará 1 cupo para el curso.")) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    try {
      await fetchApi(`/students/enrollments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "inactive" }),
      });
      setSuccessMsg("Matrícula dada de baja correctamente");
      loadData();
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || "Error al dar de baja");
    }
  };

  // Process course transfer
  const handleProcessTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentToTransfer || !transferCourseId) {
      setErrorMsg("Debe seleccionar un curso de destino");
      return;
    }

    setModalLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await fetchApi("/students/transfer", {
        method: "POST",
        body: JSON.stringify({
          enrollmentId: enrollmentToTransfer.id,
          targetCourseId: transferCourseId,
        }),
      });

      setSuccessMsg(`Transferencia procesada correctamente para el alumno ${enrollmentToTransfer.student.firstName}`);
      setEnrollmentToTransfer(null);
      loadData();
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || "Error al transferir al alumno");
    } finally {
      setModalLoading(false);
    }
  };

  // Filter logs for the bottom table
  const filteredLogs = React.useMemo(() => {
    const query = logSearchQuery.trim().toLowerCase();
    if (!query) return enrollments;
    return enrollments.filter((enroll) => {
      const studentName = `${enroll.student?.firstName || ""} ${enroll.student?.lastName || ""}`.toLowerCase();
      const ci = enroll.student?.ci || "";
      return studentName.includes(query) || ci.includes(query);
    });
  }, [enrollments, logSearchQuery]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredLogs.length / historyPageSize));
  const safeHistoryPage = Math.min(Math.max(1, historyPage), totalHistoryPages);
  const paginatedLogs = React.useMemo(() => {
    return filteredLogs.slice(
      (safeHistoryPage - 1) * historyPageSize,
      safeHistoryPage * historyPageSize
    );
  }, [filteredLogs, safeHistoryPage, historyPageSize]);





  // Helper: Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Terminal de Inscripción (Matrículas)</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Registre alumnos en la oferta académica activa y emita comprobantes.</p>
        </div>
      </div>

      {/* Main Alert Banners */}
      {errorMsg && (
        <div className="p-4 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 shadow-xs print:hidden animate-in fade-in">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error en la validación</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 shadow-xs print:hidden animate-in fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Acción exitosa</p>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {/* SECTION 1: SEARCH STUDENT & ENROLLMENT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Step 1 & 3: Student selector & Cart (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Autocomplete Student Search Card */}
          <Card className="border border-slate-200/90 shadow-xs rounded-2xl overflow-visible relative bg-white">
            <CardHeader className="pb-3.5 pt-5 px-5">
              <CardTitle className="text-slate-900 text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-slate-800" /> Paso 1: Seleccionar Alumno
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Busque y seleccione al alumno para la inscripción.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              {/* Autocomplete Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o cédula..."
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    setIsStudentDropdownOpen(true);
                  }}
                  onFocus={() => setIsStudentDropdownOpen(true)}
                  className="pl-10 h-10 rounded-xl border-slate-200 text-xs font-medium text-slate-900 focus:border-[#2C58A2] focus:ring-2 focus:ring-[#2C58A2]/15"
                />

                {/* Suggestions Dropdown */}
                {isStudentDropdownOpen && studentSearchQuery && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50">
                    {filteredStudentSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No se encontraron alumnos activos
                      </div>
                    ) : (
                      filteredStudentSuggestions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setIsStudentDropdownOpen(false);
                            setStudentSearchQuery(`${s.firstName} ${s.lastName}`);
                            setCart([]); // Clear cart upon switching student
                            setErrorMsg("");
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 flex justify-between items-center text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{s.firstName} {s.lastName}</p>
                            <p className="text-[10px] text-slate-500 font-semibold">CI N°: {s.ci}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Student profile info */}
              {selectedStudent && (
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 text-slate-800 rounded-full flex items-center justify-center font-extrabold text-xs shadow-2xs shrink-0">
                      {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 leading-tight text-sm">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold">CI N°: {selectedStudent.ci}</p>
                    </div>
                  </div>

                  {selectedStudent.tutor && (
                    <div className="text-xs border-t border-slate-200/80 pt-2.5 text-slate-600">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tutor Legal:</p>
                      <p className="font-semibold text-slate-800 text-xs mt-0.5">{selectedStudent.tutor.firstName} {selectedStudent.tutor.lastName} ({selectedStudent.tutor.phone})</p>
                    </div>
                  )}

                  {/* Current Active Enrollments list */}
                  <div className="border-t border-slate-200/80 pt-2.5 space-y-1.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cursos del Alumno:</p>
                    {enrollments.filter(e => e.studentId === selectedStudent.id && e.status === "active").length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No está matriculado en ningún curso activo.</p>
                    ) : (
                      <div className="space-y-1">
                        {enrollments
                          .filter(e => e.studentId === selectedStudent.id && e.status === "active")
                          .map(e => (
                            <div key={e.id} className="flex justify-between items-center text-xs bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg shadow-2xs">
                              <span className="font-bold text-slate-800">{e.course?.name} ({e.course?.level})</span>
                              <span className="text-[10px] font-bold text-[#2C58A2] bg-blue-50 px-2 py-0.5 rounded">Año {e.course?.year}</span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selection Cart/Checkout Card - Step 3 */}
          <Card className="border border-slate-200/90 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/40 border-b border-slate-100 pb-3.5 pt-5 px-5">
              <CardTitle className="text-slate-900 text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-800" /> Paso 3: Resumen y Confirmación
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Clases seleccionadas para registrar en lote.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Periodo de Matrícula Field */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-800">
                  Periodo de Matrícula *
                </Label>
                <Input
                  value={`${new Date().getFullYear()}-I`}
                  readOnly
                  className="bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              {cart.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-200 text-center rounded-xl text-xs text-slate-400 space-y-1 bg-slate-50/40">
                  <Layers className="h-7 w-7 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">No hay clases seleccionadas</p>
                  <p className="text-[11px]">Seleccione clases de la oferta académica</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {cart.map(c => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex justify-between items-start text-xs shadow-2xs">
                      <div>
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{c.level}</p>
                        <div className="text-[10px] text-slate-500 font-medium mt-1 space-y-0.5">
                          {c.schedules?.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span>{s.dayOfWeek} {s.startTime}–{s.endTime}</span>
                              <span className="text-slate-300">·</span>
                              <span>{s.classroom}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(c.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar de la selección"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardContent className="pt-0 border-t border-slate-100 bg-slate-50/40 p-5">
              <Button 
                onClick={handleCheckoutEnrollment}
                disabled={checkoutLoading || cart.length === 0 || !selectedStudent}
                className="w-full font-extrabold py-3.5 h-auto text-xs bg-[#2C58A2] hover:bg-[#224683] text-white rounded-xl shadow-md uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {checkoutLoading ? "PROCESANDO MATRÍCULA..." : "CONFIRMAR MATRÍCULA"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: CLASSES GRID & SEMAFORO (Right Column) - Step 2 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200/90 shadow-xs rounded-2xl overflow-hidden h-full flex flex-col bg-white">
            <CardHeader className="bg-slate-50/40 border-b border-slate-100 pb-3.5 pt-5 px-5">
              <CardTitle className="text-slate-900 text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-800" /> Paso 2: Seleccionar Clases (Oferta Académica)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Explore las clases configuradas. El color indica el estado de cupos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 bg-slate-50/20 flex-1 overflow-y-auto max-h-[620px]">
              {courses.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6">
                  No hay clases en la oferta académica activa.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map(c => {
                    const activeCount = getActiveEnrollmentsCount(c.id);
                    const spotsLeft = c.capacity - activeCount;

                    // Semaforo logic matching Image 2
                    let statusColor = "bg-[#D1FAE5] text-[#059669] border-emerald-200";
                    let statusText = `DISPONIBLE (${spotsLeft} DE ${c.capacity} LUGARES)`;
                    if (spotsLeft === 0) {
                      statusColor = "bg-[#FEE2E2] text-[#DC2626] border-rose-200";
                      statusText = "CLASE LLENA (0 VACANTES)";
                    } else if (spotsLeft <= 5) {
                      statusColor = "bg-[#FEF3C7] text-[#D97706] border-amber-200";
                      statusText = `¡ÚLTIMOS CUPOS! (${spotsLeft} DE ${c.capacity})`;
                    }

                    const isCartDuplicate = cart.find(item => item.id === c.id);

                    return (
                      <Card key={c.id} className="border border-slate-200/80 bg-white rounded-2xl shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between p-4 space-y-3.5">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{c.name}</h4>
                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border tracking-wider uppercase shrink-0 ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-[#F1F5F9] text-[#334155] font-bold text-[9px] rounded-md tracking-wider uppercase">
                              {c.level}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                          {c.schedules?.map((s, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {s.dayOfWeek} {s.startTime}–{s.endTime}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {s.classroom}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center gap-1.5 pt-1.5 text-xs text-slate-600">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium">
                              {c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "Docente Jeroky"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          {isCartDuplicate ? (
                            <div className="w-full py-2.5 px-3 bg-[#EFF6FF] text-[#2C58A2] border border-[#BFDBFE] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                              <Check className="h-4 w-4" /> Agregado
                            </div>
                          ) : (
                            <Button
                              onClick={() => addToCart(c)}
                              disabled={!selectedStudent || spotsLeft === 0}
                              size="sm"
                              className="w-full font-bold py-2.5 h-auto rounded-xl bg-[#2C58A2] hover:bg-[#224683] text-white text-xs shadow-xs"
                            >
                              Añadir a la matrícula
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3: HISTORICAL REGISTRATIONS LOG */}
      <Card className="border border-slate-200 shadow-md rounded-xl overflow-hidden print:hidden mt-6">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-slate-800 text-base">Historial General de Matrículas</CardTitle>
            <CardDescription>Registro de inscripciones vigentes e inactivas.</CardDescription>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar historial por alumno..."
              value={logSearchQuery}
              onChange={(e) => {
                setLogSearchQuery(e.target.value);
                setHistoryPage(1);
              }}
              className="pl-9 bg-white"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 font-semibold">
              No hay registros de matrículas almacenados en la base de datos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 pl-6">Alumno</TableHead>
                    <TableHead className="font-bold text-slate-700">Modalidad / Nivel</TableHead>
                    <TableHead className="font-bold text-slate-700">Horario</TableHead>
                    <TableHead className="font-bold text-slate-700">Aula</TableHead>
                    <TableHead className="font-bold text-slate-700">Año Lectivo</TableHead>
                    <TableHead className="font-bold text-slate-700">Estado</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-semibold text-slate-800 pl-6">
                        {log.student?.firstName} {log.student?.lastName}
                        <span className="block text-[10px] text-muted-foreground font-mono">CI: {log.student?.ci}</span>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{log.course?.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{log.course?.level}</div>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        {log.course?.schedules?.map((s, idx) => (
                          <div key={idx}>{s.dayOfWeek} {s.startTime}-{s.endTime}</div>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        {log.course?.schedules?.map((s, idx) => (
                          <div key={idx}>{s.classroom}</div>
                        ))}
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">{log.course?.year}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          log.status === "active" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : log.status === "inactive" 
                              ? "bg-red-100 text-red-800" 
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {log.status === "active" ? "Activo" : log.status === "inactive" ? "Inactivo" : "Transferido"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          {/* Reprint receipt */}
                          <Button
                            onClick={() => setReceiptEnrollment(log)}
                            size="sm"
                            variant="outline"
                            title="Ver Comprobante"
                            className="flex items-center gap-1 border-slate-200"
                          >
                            <Receipt className="h-4 w-4" /> Comprobante
                          </Button>

                          {log.status === "active" && (
                            <>
                              {/* Transfer Button */}
                              <Button
                                onClick={() => {
                                  setErrorMsg("");
                                  setTransferCourseId(courses[0]?.id || "");
                                  setEnrollmentToTransfer(log);
                                }}
                                size="sm"
                                variant="outline"
                                className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" /> Transferir
                              </Button>

                              {/* Drop Button */}
                              <Button
                                onClick={() => handleDrop(log.id)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Dar de Baja
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50">
                <Pagination
                  currentPage={safeHistoryPage}
                  totalItems={filteredLogs.length}
                  pageSize={historyPageSize}
                  onPageChange={setHistoryPage}
                  onPageSizeChange={setHistoryPageSize}
                  pageSizeOptions={[10, 25, 50, 100]}
                  itemLabel="matrículas"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: TRANSFERENCIA */}
      <Dialog open={enrollmentToTransfer !== null} onOpenChange={(open) => !open && setEnrollmentToTransfer(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {enrollmentToTransfer && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <span className="flex items-center gap-2 text-amber-700">
                    <RefreshCw className="h-6 w-6" /> Transferencia de Modulación
                  </span>
                </DialogTitle>
                <DialogDescription>
                  Cambiar el curso del alumno/a <strong>{enrollmentToTransfer.student.firstName} {enrollmentToTransfer.student.lastName}</strong>.
                </DialogDescription>
              </DialogHeader>

              {errorMsg && (
                <div className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="p-3 bg-amber-50 text-xs text-amber-800 rounded-lg border border-amber-100 space-y-1">
                <p className="font-bold">Curso Actual:</p>
                <p>{enrollmentToTransfer.course.name} ({enrollmentToTransfer.course.level}) - Año {enrollmentToTransfer.course.year}</p>
                <div className="text-slate-500 font-semibold space-y-0.5 mt-1">
                  {enrollmentToTransfer.course.schedules?.map((s, idx) => (
                    <div key={idx}>
                      {s.dayOfWeek} {s.startTime}-{s.endTime} · {s.classroom}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleProcessTransfer} className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label htmlFor="targetCourse">Curso de Destino *</Label>
                  <Select value={transferCourseId} onChange={(e) => setTransferCourseId(e.target.value)}>
                    {courses
                      .filter(c => c.id !== enrollmentToTransfer.courseId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.level}) - Año {c.year} - {formatCourseSchedules(c)}
                        </option>
                      ))}
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEnrollmentToTransfer(null)}>
                    CANCELAR
                  </Button>
                  <Button type="submit" disabled={modalLoading} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    {modalLoading ? "TRANSFERIENDO..." : "CONFIRMAR TRANSFERENCIA"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: COMPROBANTE INDIVIDUAL (IMPRIMIBLE) */}
      <Dialog open={receiptEnrollment !== null} onOpenChange={(open) => !open && setReceiptEnrollment(null)}>
        <DialogContent className="max-w-[650px] p-0 overflow-hidden bg-white border border-slate-300">
          {receiptEnrollment && (
            <div className="flex flex-col bg-white">
              {/* Receipt Header */}
              <div className="p-6 bg-slate-900 text-white text-center flex flex-col justify-center items-center relative">
                <GraduationCap className="h-10 w-10 mb-2 text-white" />
                <h3 className="text-xl font-extrabold tracking-wider">JEROKY SOFT</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#38BDF8] mt-0.5">Academia de Danza Jeroky Paraguai</p>
                <div className="absolute right-4 top-4 print:hidden">
                  <button 
                    onClick={() => setReceiptEnrollment(null)}
                    className="p-1 hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="p-8 space-y-6 relative bg-white">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  <GraduationCap className="w-80 h-80 text-black" />
                </div>

                <div className="text-center space-y-1">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full uppercase">
                    Comprobante de Inscripción Oficial
                  </span>
                  <p className="text-[10px] text-muted-foreground pt-1.5">Emitido el: {new Date(receiptEnrollment.createdAt).toLocaleString("es-PY")}</p>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Alumno / Alumna</p>
                    <p className="font-extrabold text-slate-800">{receiptEnrollment.student.firstName} {receiptEnrollment.student.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Cédula de Identidad (CI)</p>
                    <p className="font-mono font-bold text-slate-800">{receiptEnrollment.student.ci}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Modalidad / Danza</p>
                    <p className="font-bold text-primary">{receiptEnrollment.course.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Nivel Académico</p>
                    <p className="font-bold text-slate-800">{receiptEnrollment.course.level}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Horario de Clases</p>
                    <div className="font-medium text-slate-700 space-y-0.5 mt-0.5">
                      {receiptEnrollment.course.schedules?.map((s, idx) => (
                        <div key={idx}>
                          {s.dayOfWeek} {s.startTime}–{s.endTime} · {s.classroom}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Profesor / Docente</p>
                    <p className="font-semibold text-slate-800">
                      {receiptEnrollment.course.teacher 
                        ? `${receiptEnrollment.course.teacher.firstName} ${receiptEnrollment.course.teacher.lastName}` 
                        : "No asignado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Año Lectivo</p>
                    <p className="font-semibold text-slate-800">{receiptEnrollment.course.year}</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-center text-slate-500 font-semibold space-y-1">
                  <p>Este documento constituye un comprobante formal de la asignación académica en la Academia de Danza Jeroky Paraguai.</p>
                  <p className="font-mono text-slate-400">Huella digital de seguridad: {receiptEnrollment.id.substring(0,8)}-{receiptEnrollment.studentId.substring(0,4)}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 print:hidden">
                <Button variant="outline" onClick={() => setReceiptEnrollment(null)}>
                  CERRAR
                </Button>
                <Button onClick={handlePrintReceipt} className="flex items-center gap-2 font-bold bg-slate-800 hover:bg-slate-900 text-white">
                  <Printer className="h-4 w-4" /> IMPRIMIR COMPROBANTE
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: COMPROBANTE MÚLTIPLE / LOTE (IMPRIMIBLE AL CONFIRMAR MATRÍCULA) */}
      <Dialog open={bulkReceiptEnrollments.length > 0} onOpenChange={(open) => !open && setBulkReceiptEnrollments([])}>
        <DialogContent className="max-w-[700px] p-0 overflow-hidden bg-white border border-slate-300">
          {bulkReceiptEnrollments.length > 0 && (
            <div className="flex flex-col bg-white">
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white text-center flex flex-col justify-center items-center relative">
                <GraduationCap className="h-10 w-10 mb-2 text-white" />
                <h3 className="text-xl font-extrabold tracking-wider">JEROKY SOFT</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#38BDF8] mt-0.5">Academia de Danza Jeroky Paraguai</p>
                <div className="absolute right-4 top-4 print:hidden">
                  <button 
                    onClick={() => setBulkReceiptEnrollments([])}
                    className="p-1 hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 relative bg-white">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  <GraduationCap className="w-80 h-80 text-black" />
                </div>

                <div className="text-center space-y-1">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full uppercase">
                    Comprobante de Matrícula General (Lote)
                  </span>
                  <p className="text-[10px] text-muted-foreground pt-1.5">
                    Alumno: <strong>{bulkReceiptEnrollments[0].student.firstName} {bulkReceiptEnrollments[0].student.lastName}</strong>
                  </p>
                  <p className="text-[10px] text-muted-foreground">CI N°: <strong>{bulkReceiptEnrollments[0].student.ci}</strong> | Año Lectivo: <strong>{bulkReceiptEnrollments[0].course?.year || new Date().getFullYear()}</strong></p>
                </div>

                <hr className="border-slate-100" />

                {/* Table of Enrolled Modalities */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Clases registradas con éxito:</p>
                  <Table className="border border-slate-100">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-800">Modalidad</TableHead>
                        <TableHead className="font-bold text-slate-800">Nivel</TableHead>
                        <TableHead className="font-bold text-slate-800">Horario</TableHead>
                        <TableHead className="font-bold text-slate-800">Aula</TableHead>
                        <TableHead className="font-bold text-slate-800">Docente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkReceiptEnrollments.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="font-semibold text-slate-850">{e.course.name}</TableCell>
                          <TableCell>{e.course.level}</TableCell>
                          <TableCell className="text-xs font-mono space-y-0.5">
                            {e.course.schedules?.map((s, idx) => (
                              <div key={idx}>{s.dayOfWeek} {s.startTime}–{s.endTime}</div>
                            ))}
                          </TableCell>
                          <TableCell className="text-xs space-y-0.5">
                            {e.course.schedules?.map((s, idx) => (
                              <div key={idx}>{s.classroom}</div>
                            ))}
                          </TableCell>
                          <TableCell className="text-xs">
                            {e.course.teacher ? `${e.course.teacher.firstName} ${e.course.teacher.lastName}` : "Por definir"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-center text-slate-500 font-semibold space-y-1">
                  <p>Este documento constituye un comprobante formal de la asignación académica en la Academia de Danza Jeroky Paraguai.</p>
                  <p className="font-mono text-slate-400">Huella digital del lote: {bulkReceiptEnrollments.map(e=>e.id.substring(0,4)).join("-")}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 print:hidden">
                <Button variant="outline" onClick={() => setBulkReceiptEnrollments([])}>
                  CERRAR
                </Button>
                <Button onClick={handlePrintReceipt} className="flex items-center gap-2 font-bold bg-primary hover:bg-primary/95 text-white">
                  <Printer className="h-4 w-4" /> IMPRIMIR MATRÍCULAS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
