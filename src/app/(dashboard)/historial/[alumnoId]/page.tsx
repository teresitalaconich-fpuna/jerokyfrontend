"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../../components/ui/table";
import { fetchApi, ensureAuth, EvaluationStage } from "../../../../lib/api";
import { 
  FileDown, 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  BookOpen, 
  User, 
  Phone, 
  Layers, 
  AlertCircle,
  Camera
} from "lucide-react";
import FaceEnrollmentModal from "../../../../components/biometrics/FaceEnrollmentModal";
import { JerokyLogo } from "../../../../components/ui/logo";

interface TutorInfo {
  id?: string;
  firstName: string;
  lastName: string;
  ci: string;
  phone?: string;
  relationship?: string;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  birthDate?: string;
  status?: string;
  tutor?: TutorInfo | null;
  biometricConsent?: boolean;
  biometricTemplateId?: string;
}

interface EnrollmentInfo {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  course?: {
    id: string;
    name: string;
    level: string;
    year?: number;
  };
}

interface GradeRecord {
  id: string;
  studentId?: string;
  courseId?: string;
  techniqueScore: number;
  expressionScore: number;
  disciplineScore: number;
  average: number;
  stage: EvaluationStage | string;
  createdAt?: string | Date;
  course?: {
    id?: string;
    name: string;
    level: string;
    year?: number;
  };
}

const STAGE_ORDER: Record<string, number> = {
  [EvaluationStage.ETAPA_1]: 1,
  "1ra Etapa": 1,
  "Etapa 1": 1,
  [EvaluationStage.ETAPA_2]: 2,
  "2da Etapa": 2,
  "Etapa 2": 2,
  [EvaluationStage.EXAMEN_FINAL]: 3,
  "Final": 3,
  [EvaluationStage.RECUPERATORIO]: 4,
};

function getStageOrder(stage: string): number {
  return STAGE_ORDER[stage] ?? 99;
}

function getStageBadgeStyle(stage: string): string {
  const norm = (stage || "").trim();
  if (norm.includes("1ª") || norm.includes("1ra") || norm.includes("Etapa 1")) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (norm.includes("2ª") || norm.includes("2da") || norm.includes("Etapa 2")) {
    return "bg-indigo-100 text-indigo-800 border-indigo-200";
  }
  if (norm.includes("Examen Final") || norm.includes("Final")) {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }
  if (norm.includes("Recuperatorio")) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getScoreConceptualScale(score: number): { label: string; grade: number; color: string; bg: string; status: string } {
  if (score >= 91) return { label: "Sobresaliente", grade: 5, color: "text-emerald-700 font-bold", bg: "bg-emerald-50 text-emerald-800 border-emerald-200", status: "Aprobado" };
  if (score >= 81) return { label: "Muy Bueno", grade: 4, color: "text-blue-700 font-bold", bg: "bg-blue-50 text-blue-800 border-blue-200", status: "Aprobado" };
  if (score >= 71) return { label: "Bueno", grade: 3, color: "text-indigo-700 font-bold", bg: "bg-indigo-50 text-indigo-800 border-indigo-200", status: "Aprobado" };
  if (score >= 60) return { label: "Aceptable", grade: 2, color: "text-amber-700 font-bold", bg: "bg-amber-50 text-amber-800 border-amber-200", status: "Aprobado" };
  return { label: "Insuficiente", grade: 1, color: "text-red-700 font-bold", bg: "bg-red-50 text-red-800 border-red-200", status: "A Recuperación" };
}

function calculateAge(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

interface PageProps {
  params?: Promise<{ alumnoId: string }> | { alumnoId: string };
}

export default function HistorialAlumnoPage({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams();

  let unwrappedId: string | undefined;
  if (params) {
    if (typeof (params as { then?: unknown })?.then === "function") {
      const resolved = use(params as Promise<{ alumnoId: string }>);
      unwrappedId = resolved?.alumnoId;
    } else {
      unwrappedId = (params as { alumnoId: string })?.alumnoId;
    }
  }
  if (!unwrappedId && routeParams?.alumnoId) {
    const raw = routeParams.alumnoId;
    unwrappedId = Array.isArray(raw) ? raw[0] : raw;
  }
  const studentId = unwrappedId || "";

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFaceModal, setShowFaceModal] = useState(false);

  const refreshStudent = React.useCallback(async () => {
    if (!studentId) return;
    try {
      const data = await fetchApi<StudentInfo>(`/students/${studentId}`);
      if (data) setStudent(data);
    } catch {
      // ignore
    }
  }, [studentId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!studentId) {
        if (active) setLoading(false);
        return;
      }

      try {
        await ensureAuth();
        const [studentData, gradesData, enrollmentsData] = await Promise.all([
          fetchApi<StudentInfo>(`/students/${studentId}`).catch(() => null),
          fetchApi<GradeRecord[]>(`/grades/student/${studentId}`).catch(() => []),
          fetchApi<EnrollmentInfo[]>(`/students/info/enrollments`).catch(() => []),
        ]);

        if (active) {
          setStudent(studentData);
          setGrades(Array.isArray(gradesData) ? gradesData : []);
          
          const studentEnrollments = Array.isArray(enrollmentsData)
            ? enrollmentsData.filter((e) => e.studentId === studentId || (e as { student?: { id: string } }).student?.id === studentId)
            : [];
          setEnrollments(studentEnrollments);
        }
      } catch {
        if (active) {
          setStudent(null);
          setGrades([]);
          setEnrollments([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [studentId]);

  const groupedGradesByYear = useMemo(() => {
    const map = new Map<number, GradeRecord[]>();

    for (const g of grades) {
      const year =
        g.course?.year ||
        (g.createdAt ? new Date(g.createdAt).getFullYear() : new Date().getFullYear());
      if (!map.has(year)) {
        map.set(year, []);
      }
      map.get(year)!.push(g);
    }

    const sortedYears = Array.from(map.keys()).sort((a, b) => b - a);

    return sortedYears.map((year) => {
      const yearGrades = map.get(year) || [];
      yearGrades.sort((a, b) => {
        const courseA = a.course?.name || "";
        const courseB = b.course?.name || "";
        if (courseA !== courseB) {
          return courseA.localeCompare(courseB);
        }
        return getStageOrder(a.stage) - getStageOrder(b.stage);
      });

      const yearAvg =
        yearGrades.length > 0
          ? Number(
              (
                yearGrades.reduce((acc, curr) => acc + (Number(curr.average) || 0), 0) /
                yearGrades.length
              ).toFixed(2)
            )
          : 0;

      return {
        year,
        grades: yearGrades,
        yearAverage: yearAvg,
        overallScale: getScoreConceptualScale(yearAvg),
      };
    });
  }, [grades]);

  const cumulativeAverage = useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, curr) => acc + (Number(curr.average) || 0), 0);
    return Number((sum / grades.length).toFixed(2));
  }, [grades]);

  const uniqueCoursesCount = useMemo(() => {
    const set = new Set(grades.map((g) => g.course?.name || ""));
    return set.size;
  }, [grades]);

  const overallScale = useMemo(() => {
    return getScoreConceptualScale(cumulativeAverage);
  }, [cumulativeAverage]);

  const handlePrint = () => {
    window.print();
  };

  const studentAge = student?.birthDate ? calculateAge(student.birthDate) : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm font-semibold text-slate-500">Cargando legajo e historial académico oficial...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-md mx-auto my-20 text-center p-8 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <p className="text-lg font-bold text-slate-800">Estudiante no encontrado</p>
        <p className="text-sm text-muted-foreground">
          No se pudo recuperar el legajo del estudiante seleccionado con el identificador proporcionado.
        </p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Listado de Alumnos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Button
          variant="outline"
          className="flex items-center gap-2 w-fit bg-white hover:bg-slate-50 border-slate-300 shadow-xs"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Listado
        </Button>
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow"
          >
            <FileDown className="h-4 w-4" /> Imprimir / Exportar Ficha Académica
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-2 border-slate-200 shadow-sm print:border-none print:shadow-none bg-white">
          <CardHeader className="bg-slate-50/90 border-b border-slate-200 print:bg-transparent print:border-b-2 print:border-slate-800 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <JerokyLogo size={42} />
                  <div>
                    <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 leading-none">
                      JEROKY SOFT
                    </CardTitle>
                    <p className="text-xs font-bold text-[#2C58A2] tracking-wider uppercase mt-1">
                      Academia de Danza Jeroky Paraguai
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Academia Integral de Danzas • Asunción, Paraguay
                </p>
              </div>
              <div className="text-left sm:text-right border-l-2 sm:border-l-0 pl-3 sm:pl-0 border-primary">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-md uppercase tracking-wider mb-1">
                  Ficha y Legajo Académico
                </span>
                <p className="text-xs text-muted-foreground font-semibold">
                  Fecha de Emisión: {new Date().toLocaleDateString("es-PY", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-5 bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shrink-0 border border-primary/20">
                    {student.firstName ? student.firstName[0] : "A"}
                    {student.lastName ? student.lastName[0] : "L"}
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Ficha y Legajo de Alumna/o
                    </p>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">
                      {student.firstName} {student.lastName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 font-medium">
                      <span>
                        <strong className="text-slate-800">C.I. N°:</strong> {student.ci}
                      </span>
                      {studentAge !== null && (
                        <span>
                          <strong className="text-slate-800">Edad:</strong> {studentAge} años
                        </span>
                      )}
                      <span>
                        <strong className="text-slate-800">Estado:</strong>{" "}
                        <span className={`font-bold capitalize ${student.status === "inactive" ? "text-red-700" : "text-emerald-700"}`}>
                          {student.status || "Activo"}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <strong className="text-slate-800">Biometría:</strong>
                        {student.biometricTemplateId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Rostro Registrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            <AlertCircle className="h-3 w-3 text-amber-600" /> Sin Rostro
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowFaceModal(true)}
                          className="h-6 px-2 text-[11px] font-bold text-[#2C58A2] border-blue-200 bg-blue-50/50 hover:bg-blue-100 ml-1 print:hidden rounded-lg"
                        >
                          <Camera className="h-3 w-3 mr-1 text-[#2C58A2]" />
                          {student.biometricTemplateId ? "Actualizar Rostro" : "Capturar Rostro"}
                        </Button>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  {student.tutor ? (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        <strong>Tutor/a:</strong> {student.tutor.firstName} {student.tutor.lastName} (C.I. {student.tutor.ci})
                      </span>
                      {student.tutor.phone && (
                        <span className="flex items-center gap-1 text-slate-500 ml-1">
                          <Phone className="h-3 w-3" /> {student.tutor.phone}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User className="h-3.5 w-3.5" />
                      <span>Mayor de edad / Sin tutor asignado</span>
                    </div>
                  )}

                  {enrollments.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-slate-700">
                        {enrollments.length} {enrollments.length === 1 ? "Matrícula Activa" : "Matrículas Activas"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 bg-primary/5 rounded-xl border border-primary/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">
                      Promedio Acumulado
                    </p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${overallScale.bg}`}>
                      Escala {overallScale.grade} ({overallScale.label})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-primary">
                      {cumulativeAverage.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">/ 100 pts</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-primary/10 text-xs font-medium text-slate-600 text-center">
                  <div>
                    <span className="block font-black text-slate-800 text-sm">{groupedGradesByYear.length}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{groupedGradesByYear.length === 1 ? "Ciclo" : "Ciclos"}</span>
                  </div>
                  <div>
                    <span className="block font-black text-slate-800 text-sm">{uniqueCoursesCount}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{uniqueCoursesCount === 1 ? "Modalidad" : "Modalidades"}</span>
                  </div>
                  <div>
                    <span className="block font-black text-slate-800 text-sm">{grades.length}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{grades.length === 1 ? "Etapa" : "Etapas"}</span>
                  </div>
                </div>
              </div>
            </div>

            {groupedGradesByYear.length === 0 ? (
              <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                <BookOpen className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700">Sin calificaciones registradas</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  La alumna se encuentra matriculada, pero aún no se han asentado evaluaciones en las etapas académicas del ciclo lectivo.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedGradesByYear.map((group) => (
                  <div
                    key={group.year}
                    className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white break-inside-avoid print:border-slate-300"
                  >
                    <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="font-extrabold text-slate-900 text-base">
                          Año Lectivo {group.year}
                        </h3>
                        <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                          {group.grades.length} {group.grades.length === 1 ? "evaluación oficial" : "evaluaciones oficiales"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-600">Promedio del Ciclo:</span>
                        <span className="px-3 py-1 bg-primary text-white font-extrabold text-xs rounded-md shadow-xs">
                          {group.yearAverage.toFixed(2)} pts
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${group.overallScale.bg}`}>
                          Escala {group.overallScale.grade} ({group.overallScale.label})
                        </span>
                      </div>
                    </div>

                    <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow className="bg-slate-50/70 border-b border-slate-200">
                          <TableHead className="font-bold text-slate-700">Modalidad / Curso</TableHead>
                          <TableHead className="font-bold text-slate-700">Nivel</TableHead>
                          <TableHead className="font-bold text-slate-700">Etapa Evaluativa</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Técnica (0-100)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Expresión (0-100)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Disciplina (0-100)</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Promedio</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Escala Conceptual</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Condición</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.grades.map((grade) => {
                          const scale = getScoreConceptualScale(grade.average);
                          return (
                            <TableRow key={grade.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-bold text-slate-900">
                                {grade.course?.name || "Curso Regular"}
                              </TableCell>
                              <TableCell className="text-slate-600 font-medium">
                                {grade.course?.level || "General"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStageBadgeStyle(
                                    grade.stage
                                  )}`}
                                >
                                  {grade.stage}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-semibold text-slate-700">
                                {grade.techniqueScore}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-slate-700">
                                {grade.expressionScore}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-slate-700">
                                {grade.disciplineScore}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-extrabold text-primary text-sm">
                                  {Number(grade.average).toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${scale.bg}`}>
                                  {scale.grade} - {scale.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={`text-xs font-bold ${scale.grade >= 2 ? "text-emerald-700" : "text-red-700"}`}>
                                  {scale.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-8 border-t border-slate-200 mt-8 break-inside-avoid">
              <div className="hidden print:grid grid-cols-2 gap-16 pt-16 pb-8 text-center">
                <div className="border-t-2 border-slate-800 pt-2">
                  <p className="font-bold text-xs text-slate-900">Prof. Responsable / Dirección Artística</p>
                  <p className="text-[10px] text-slate-600">Centro de Danzas Jeroky Paraguay</p>
                </div>
                <div className="border-t-2 border-slate-800 pt-2">
                  <p className="font-bold text-xs text-slate-900">Secretaría Académica / Dirección General</p>
                  <p className="text-[10px] text-slate-600">Centro de Danzas Jeroky Paraguay</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 pt-2">
                <p className="font-semibold text-center sm:text-left">
                  Documento oficial emitido por el Sistema Jeroky Soft - Centro de Danzas.
                </p>
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-4 w-4" /> Registro Académico Institucional
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Face Enrollment Modal */}
      {student && (
        <FaceEnrollmentModal
          student={student}
          isOpen={showFaceModal}
          onClose={() => setShowFaceModal(false)}
          onFaceUpdated={refreshStudent}
        />
      )}
    </div>
  );
}
