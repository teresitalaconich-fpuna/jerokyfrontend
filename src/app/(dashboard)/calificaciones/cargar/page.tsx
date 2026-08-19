"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../../components/ui/table";
import {
  fetchApi,
  ensureAuth,
  EvaluationStage,
  saveGradesBatch,
  getGradesByCourse,
  getAcademicPeriods,
  IAcademicPeriod,
  IGrade,
} from "../../../../lib/api";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Award,
  Users,
  X,
  Loader2,
} from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dni?: string;
}

interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  student?: Student;
}

interface Course {
  id: string;
  name: string;
  level: string;
  year?: number;
}

interface GradeRow {
  studentId: string;
  studentName: string;
  dni: string;
  technique: string;
  expression: string;
  discipline: string;
  average: number;
}

const DEFAULT_OFFICIAL_STAGES = [
  {
    value: "1ª Etapa",
    label: "1ª Etapa",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "2ª Etapa",
    label: "2ª Etapa",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    value: "Examen Final",
    label: "Examen Final",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    value: "Recuperatorio",
    label: "Recuperatorio",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
];

export default function CargarCalificacionesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("1ª Etapa");
  const [availableStages, setAvailableStages] = useState<{
    value: string;
    label: string;
    badgeClass: string;
  }[]>(DEFAULT_OFFICIAL_STAGES);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<GradeRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingGrades, setFetchingGrades] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial load of courses, enrollments, and students
  const loadInitialData = useCallback(async () => {
    try {
      await ensureAuth();
      const [loadedCourses, loadedEnrollments, loadedStudents] =
        await Promise.all([
          fetchApi<Course[]>("/courses").catch(() => []),
          fetchApi<Enrollment[]>("/students/info/enrollments").catch(() => []),
          fetchApi<Student[]>("/students").catch(() => []),
        ]);

      const finalCourses = Array.isArray(loadedCourses) ? loadedCourses : [];
      setCourses(finalCourses);
      setEnrollments(Array.isArray(loadedEnrollments) ? loadedEnrollments : []);
      setAllStudents(Array.isArray(loadedStudents) ? loadedStudents : []);

      if (finalCourses.length > 0) {
        setSelectedCourse(finalCourses[0].id);
      }
    } catch {
      setCourses([]);
      setEnrollments([]);
      setAllStudents([]);
    }
  }, []);

  // Dynamic load of periods for selected course's year
  useEffect(() => {
    let isMounted = true;
    async function loadStagesForCourse() {
      if (!selectedCourse) return;
      const courseObj = courses.find((c) => c.id === selectedCourse);
      const year = courseObj?.year || new Date().getFullYear();

      try {
        const periods = await getAcademicPeriods(year);
        if (!isMounted) return;

        if (Array.isArray(periods) && periods.length > 0) {
          const mapped = periods.map((p, idx) => {
            const badgeClasses = [
              "bg-blue-100 text-blue-800 border-blue-200",
              "bg-emerald-100 text-emerald-800 border-emerald-200",
              "bg-purple-100 text-purple-800 border-purple-200",
              "bg-amber-100 text-amber-800 border-amber-200",
              "bg-indigo-100 text-indigo-800 border-indigo-200",
            ];
            return {
              value: p.name,
              label: p.name,
              badgeClass: badgeClasses[idx % badgeClasses.length],
            };
          });
          setAvailableStages(mapped);
          setSelectedStage((current) =>
            mapped.some((m) => m.value === current) ? current : mapped[0].value
          );
        } else {
          setAvailableStages(DEFAULT_OFFICIAL_STAGES);
          setSelectedStage((current) =>
            DEFAULT_OFFICIAL_STAGES.some((m) => m.value === current)
              ? current
              : DEFAULT_OFFICIAL_STAGES[0].value
          );
        }
      } catch {
        if (isMounted) {
          setAvailableStages(DEFAULT_OFFICIAL_STAGES);
        }
      }
    }

    loadStagesForCourse();

    return () => {
      isMounted = false;
    };
  }, [selectedCourse, courses]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadInitialData();
      }
    });
    return () => {
      active = false;
    };
  }, [loadInitialData]);

  // Load existing grades whenever selectedCourse or selectedStage changes
  const loadGradesForCourseAndStage = useCallback(async () => {
    if (!selectedCourse) return;

    setFetchingGrades(true);
    setError(null);

    // Determine students belonging to the selected course
    const courseEnrollments = enrollments.filter(
      (e) => e.courseId === selectedCourse && e.status === "active"
    );

    const enrolledStudents: { id: string; name: string; dni: string }[] =
      courseEnrollments
        .map((e) => {
          const student =
            e.student || allStudents.find((s) => s.id === e.studentId);
          return student
            ? {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`.trim(),
                dni: student.dni || "",
              }
            : null;
        })
        .filter((s): s is { id: string; name: string; dni: string } => s !== null);

    try {
      const existingGrades: IGrade[] = await getGradesByCourse(
        selectedCourse,
        selectedStage
      );

      const gradeMap = new Map(existingGrades.map((g) => [g.studentId, g]));

      const populatedRows: GradeRow[] = enrolledStudents.map((s) => {
        const grade = gradeMap.get(s.id);
        if (grade) {
          return {
            studentId: s.id,
            studentName: s.name,
            dni: s.dni,
            technique: String(grade.techniqueScore),
            expression: String(grade.expressionScore),
            discipline: String(grade.disciplineScore),
            average: grade.average,
          };
        }
        return {
          studentId: s.id,
          studentName: s.name,
          dni: s.dni,
          technique: "",
          expression: "",
          discipline: "",
          average: 0,
        };
      });

      setRows(populatedRows);
    } catch {
      // Fallback empty rows
      setRows(
        enrolledStudents.map((s) => ({
          studentId: s.id,
          studentName: s.name,
          dni: s.dni,
          technique: "",
          expression: "",
          discipline: "",
          average: 0,
        }))
      );
    } finally {
      setFetchingGrades(false);
    }
  }, [selectedCourse, selectedStage, enrollments, allStudents]);

  useEffect(() => {
    if (!selectedCourse) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadGradesForCourseAndStage();
      }
    });
    return () => {
      active = false;
    };
  }, [selectedCourse, selectedStage, loadGradesForCourseAndStage]);

  // Handle score typing with dynamic average recalculation
  const handleInputChange = (
    studentId: string,
    field: "technique" | "expression" | "discipline",
    val: string
  ) => {
    // Only allow numbers between 0-100 or empty strings
    if (
      val !== "" &&
      (!/^\d+$/.test(val) || parseInt(val, 10) < 0 || parseInt(val, 10) > 100)
    ) {
      return;
    }

    setRows((prev) =>
      prev.map((row) => {
        if (row.studentId === studentId) {
          const updatedRow = { ...row, [field]: val };

          // Dynamic average recalculation (0-100)
          const t = parseInt(updatedRow.technique, 10);
          const e = parseInt(updatedRow.expression, 10);
          const d = parseInt(updatedRow.discipline, 10);

          const validScores = [t, e, d].filter((s) => !isNaN(s));
          if (validScores.length === 3) {
            updatedRow.average = parseFloat(((t + e + d) / 3).toFixed(2));
          } else if (validScores.length > 0) {
            const sum = validScores.reduce((acc, curr) => acc + curr, 0);
            updatedRow.average = parseFloat((sum / validScores.length).toFixed(2));
          } else {
            updatedRow.average = 0;
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  const handleSave = async () => {
    const filledRows = rows.filter(
      (r) => r.technique !== "" || r.expression !== "" || r.discipline !== ""
    );

    if (filledRows.length === 0) {
      setError("Debe cargar al menos una calificación antes de guardar.");
      return;
    }

    const incompleteRow = filledRows.find(
      (r) => r.technique === "" || r.expression === "" || r.discipline === ""
    );

    if (incompleteRow) {
      setError(
        `El alumno "${incompleteRow.studentName}" tiene dimensiones sin calificar. Debe completar Técnica, Expresión y Disciplina (0-100).`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const gradesPayload = filledRows.map((r) => ({
        studentId: r.studentId,
        courseId: selectedCourse,
        techniqueScore: parseInt(r.technique, 10),
        expressionScore: parseInt(r.expression, 10),
        disciplineScore: parseInt(r.discipline, 10),
        stage: selectedStage,
      }));

      await saveGradesBatch(gradesPayload, selectedCourse, selectedStage);

      setSuccess(
        `Calificaciones de la "${selectedStage}" guardadas exitosamente (${filledRows.length} alumnos).`
      );
      await loadGradesForCourseAndStage();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar calificaciones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentStageInfo =
    availableStages.find((s) => s.value === selectedStage) ||
    availableStages[0] || {
      value: selectedStage,
      label: selectedStage,
      badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    };
  const evaluatedCount = rows.filter(
    (r) => r.technique !== "" && r.expression !== "" && r.discipline !== ""
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Main Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Cargar Calificaciones por Etapa
              </h1>
              <p className="text-xs text-muted-foreground">
                Evaluación ágil por dimensiones artísticas (Técnica, Expresión y Disciplina) sin bloqueos de etapa.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading || fetchingGrades || rows.length === 0}
          className="flex items-center gap-2 font-semibold shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Guardar Calificaciones
            </>
          )}
        </Button>
      </div>

      {/* Selectors and Stats Card */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> Curso / Modalidad
              </Label>
              <Select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-slate-50 text-sm font-medium"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.level} {c.year ? `(Año ${c.year})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-primary" /> Etapa de Evaluación Oficial
              </Label>
              <Select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-slate-50 text-sm font-medium"
              >
                {availableStages.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="p-2 bg-primary/10 text-primary rounded-md">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">
                  {evaluatedCount} de {rows.length} calificados
                </p>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${currentStageInfo.badgeClass}`}
                >
                  {currentStageInfo.label}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {/* Notification Banners */}
          {error && (
            <div className="mb-4 p-4 text-sm text-destructive bg-red-50 rounded-lg border border-red-200 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-destructive hover:opacity-80 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 text-sm text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Grades Table or States */}
          {fetchingGrades ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span>Consultando matriz de calificaciones para {currentStageInfo.label}...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <span className="font-semibold text-slate-700">
                No hay alumnas matriculadas activamente en esta modalidad.
              </span>
              <p className="text-xs text-muted-foreground">
                Seleccione otro curso o verifique las matrículas activas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-1/3 text-xs font-bold text-slate-700">
                      Alumno Matriculado
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-slate-700">
                      Técnica (0-100) *
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-slate-700">
                      Expresión (0-100) *
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold text-slate-700">
                      Disciplina (0-100) *
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-700">
                      Promedio de Etapa
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isPassed = row.average >= 60;
                    const hasScores =
                      row.technique !== "" ||
                      row.expression !== "" ||
                      row.discipline !== "";

                    return (
                      <TableRow key={row.studentId} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {row.studentName}
                            </p>
                            {row.dni && (
                              <p className="text-xs text-muted-foreground">
                                C.I.: {row.dni}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={row.technique}
                            onChange={(e) =>
                              handleInputChange(
                                row.studentId,
                                "technique",
                                e.target.value
                              )
                            }
                            placeholder="0 - 100"
                            className="w-24 text-center font-medium mx-auto text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={row.expression}
                            onChange={(e) =>
                              handleInputChange(
                                row.studentId,
                                "expression",
                                e.target.value
                              )
                            }
                            placeholder="0 - 100"
                            className="w-24 text-center font-medium mx-auto text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={row.discipline}
                            onChange={(e) =>
                              handleInputChange(
                                row.studentId,
                                "discipline",
                                e.target.value
                              )
                            }
                            placeholder="0 - 100"
                            className="w-24 text-center font-medium mx-auto text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-base font-bold tabular-nums ${
                                hasScores
                                  ? isPassed
                                    ? "text-emerald-700"
                                    : "text-amber-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {row.average.toFixed(2)}
                            </span>
                            {hasScores && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                  isPassed
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {isPassed ? "Aprobado" : "Reprobado"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

