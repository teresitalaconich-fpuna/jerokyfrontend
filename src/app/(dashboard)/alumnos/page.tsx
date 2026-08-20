"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { fetchApi, ensureAuth } from "../../../lib/api";
import { Plus, Search, FileText, Edit, Power, X, User, Phone, ShieldCheck, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import FaceEnrollmentModal from "../../../components/biometrics/FaceEnrollmentModal";
import { Pagination } from "../../../components/ui/pagination";

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  birthDate: string;
  status?: string;
  biometricConsent: boolean;
  biometricTemplateId: string | null;
  encryptedMedicalInfo?: string | null;
  tutor?: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    ci?: string;
    email?: string;
  } | null;
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

export default function AlumnosPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrollingStudent, setEnrollingStudent] = useState<StudentData | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCi, setEditCi] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editMedicalInfo, setEditMedicalInfo] = useState("");
  const [editBiometricConsent, setEditBiometricConsent] = useState(false);

  // Tutor edit state
  const [editHasTutor, setEditHasTutor] = useState(false);
  const [editTutorFirstName, setEditTutorFirstName] = useState("");
  const [editTutorLastName, setEditTutorLastName] = useState("");
  const [editTutorCi, setEditTutorCi] = useState("");
  const [editTutorPhone, setEditTutorPhone] = useState("");
  const [editTutorEmail, setEditTutorEmail] = useState("");

  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const loadStudents = React.useCallback(async () => {
    setLoading(true);
    try {
      await ensureAuth();
      const data = await fetchApi<StudentData[]>("/students");
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadStudents();
      }
    });
    return () => {
      active = false;
    };
  }, [loadStudents]);

  const handleOpenEdit = (student: StudentData) => {
    setEditingStudent(student);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditCi(student.ci);
    setEditBirthDate(student.birthDate ? student.birthDate.split("T")[0] : "");
    setEditMedicalInfo(student.encryptedMedicalInfo || "");
    setEditBiometricConsent(Boolean(student.biometricConsent));

    if (student.tutor) {
      setEditHasTutor(true);
      setEditTutorFirstName(student.tutor.firstName || "");
      setEditTutorLastName(student.tutor.lastName || "");
      setEditTutorCi(student.tutor.ci || "");
      setEditTutorPhone(student.tutor.phone || "");
      setEditTutorEmail(student.tutor.email || "");
    } else {
      setEditHasTutor(false);
      setEditTutorFirstName("");
      setEditTutorLastName("");
      setEditTutorCi("");
      setEditTutorPhone("");
      setEditTutorEmail("");
    }

    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (!editFirstName || !editLastName || !editCi || !editBirthDate) {
      setEditError("Por favor complete todos los campos obligatorios del alumno");
      return;
    }

    const studentAge = calculateAge(editBirthDate);
    const isMinor = studentAge !== null && studentAge < 18;

    if (isMinor && !editHasTutor) {
      setEditError("El alumno es menor de edad y requiere obligatoriamente tener un tutor legal registrado");
      return;
    }

    if (editHasTutor) {
      if (!editTutorFirstName || !editTutorLastName || !editTutorCi || !editTutorPhone) {
        setEditError("Por favor complete los datos obligatorios del tutor (Nombre, Apellido, CI y Teléfono)");
        return;
      }
    }

    setEditLoading(true);
    setEditError("");

    try {
      const payload: Record<string, unknown> = {
        firstName: editFirstName,
        lastName: editLastName,
        ci: editCi,
        birthDate: editBirthDate,
        encryptedMedicalInfo: editMedicalInfo || undefined,
        biometricConsent: editBiometricConsent,
      };

      if (editHasTutor) {
        payload.tutor = {
          firstName: editTutorFirstName,
          lastName: editTutorLastName,
          ci: editTutorCi,
          phone: editTutorPhone,
          email: editTutorEmail || `${editTutorCi}@tutor.com`,
        };
      } else {
        payload.tutor = null;
      }

      await fetchApi(`/students/${editingStudent.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      await loadStudents();
      setEditingStudent(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar alumno";
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (student: StudentData) => {
    const newStatus = student.status === "inactive" ? "active" : "inactive";
    const confirmText = newStatus === "inactive" 
      ? `¿Está seguro de que desea inactivar a ${student.firstName} ${student.lastName}?`
      : `¿Desea reactivar a ${student.firstName} ${student.lastName}?`;

    if (!window.confirm(confirmText)) return;

    try {
      await fetchApi(`/students/${student.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      loadStudents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar estado del alumno";
      alert(msg);
    }
  };

  const filteredStudents = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const ciMatch = student.ci.includes(query);
      return fullName.includes(query) || ciMatch;
    });
  }, [students, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedStudents = React.useMemo(() => {
    return filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredStudents, safePage, pageSize]);

  const editingAge = calculateAge(editBirthDate);
  const editingIsMinor = editingAge !== null && editingAge < 18;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Alumnos</h1>
          <p className="text-sm text-muted-foreground">Listado y gestión integral de alumnos registrados en la academia.</p>
        </div>
        <Link href="/alumnos/nuevo">
          <Button className="flex items-center gap-2 font-semibold shadow-sm">
            <Plus className="h-4 w-4" /> Nuevo Alumno
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o CI..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Cargando alumnos...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No se encontraron alumnos registrados.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cédula (CI)</TableHead>
                    <TableHead>Fecha de Nacimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Biometría Facial</TableHead>
                    <TableHead>Tutor / Responsable Legal</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student) => {
                  const isActive = student.status !== "inactive";
                  const hasFace = Boolean(student.biometricTemplateId);
                  return (
                    <TableRow key={student.id} className={!isActive ? "opacity-60 bg-slate-50/50" : ""}>
                      <TableCell className="font-semibold text-slate-800">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.ci}</TableCell>
                      <TableCell>{new Date(student.birthDate).toLocaleDateString("es-PY")}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}>
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasFace ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Registrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <AlertCircle className="h-3 w-3 text-slate-400" /> Sin Rostro
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.tutor ? (
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-primary" />
                              {student.tutor.firstName} {student.tutor.lastName}
                            </p>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              {student.tutor.ci && <span>CI: {student.tutor.ci}</span>}
                              {student.tutor.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {student.tutor.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Mayor de edad / Sin tutor</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 flex items-center gap-1 text-xs font-bold text-[#2C58A2] hover:text-[#2C58A2] hover:bg-blue-50 border-blue-200 bg-blue-50/50 rounded-lg"
                            onClick={() => setEnrollingStudent(student)}
                            title="Capturar o Gestionar Rostro Biométrico"
                          >
                            <Camera className="h-3.5 w-3.5 text-[#2C58A2]" /> Rostro
                          </Button>
                          <Link href={`/historial/${student.id}`}>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white" title="Ver Ficha y Legajo Académico">
                              <FileText className="h-3.5 w-3.5 text-primary" /> Ver Ficha
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-2.5 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(student)}
                            title="Editar Datos del Alumno y Tutor"
                          >
                            <Edit className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className={`h-8 px-2 flex items-center gap-1 text-xs ${
                              isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            }`}
                            onClick={() => handleToggleStatus(student)}
                            title={isActive ? "Inactivar Alumno" : "Reactivar Alumno"}
                          >
                            <Power className="h-3.5 w-3.5" /> {isActive ? "Inactivar" : "Reactivar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t border-slate-100 mt-3 pt-2">
              <Pagination
                currentPage={safePage}
                totalItems={filteredStudents.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
                itemLabel="alumnos"
              />
            </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200 overflow-y-auto">
          <Card className="w-full max-w-xl shadow-2xl bg-white my-8 max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Editar Datos del Alumno</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Modifique la información personal y los datos del tutor legal.</p>
                </div>
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1">
              <CardContent className="space-y-5 p-6">
                {editError && (
                  <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20 font-medium">
                    {editError}
                  </div>
                )}

                {/* Section 1: Student Personal Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Datos Personales del Alumno
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="editFirstName" className="text-xs font-semibold">Nombre *</Label>
                      <Input
                        id="editFirstName"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editLastName" className="text-xs font-semibold">Apellido *</Label>
                      <Input
                        id="editLastName"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="editCi" className="text-xs font-semibold">Cédula de Identidad (CI) *</Label>
                      <Input
                        id="editCi"
                        value={editCi}
                        onChange={(e) => setEditCi(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editBirthDate" className="text-xs font-semibold">
                        Fecha de Nacimiento * {editingAge !== null && `(${editingAge} años)`}
                      </Label>
                      <Input
                        id="editBirthDate"
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="editMedical" className="text-xs font-semibold">Información Médica / Alergias (Cifrada)</Label>
                    <textarea
                      id="editMedical"
                      value={editMedicalInfo}
                      onChange={(e) => setEditMedicalInfo(e.target.value)}
                      placeholder="Observaciones médicas o alergias..."
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                {/* Section 2: Tutor Information */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" /> Datos del Tutor / Responsable Legal
                    </h4>
                    {editingIsMinor ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Obligatorio (Menor de edad)
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="editHasTutorCheck"
                          checked={editHasTutor}
                          onChange={(e) => setEditHasTutor(e.target.checked)}
                        />
                        <label htmlFor="editHasTutorCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                          Asignar tutor
                        </label>
                      </div>
                    )}
                  </div>

                  {(editHasTutor || editingIsMinor) && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="editTutorFirstName" className="text-xs font-semibold">Nombre del Tutor *</Label>
                          <Input
                            id="editTutorFirstName"
                            value={editTutorFirstName}
                            onChange={(e) => setEditTutorFirstName(e.target.value)}
                            required={editingIsMinor || editHasTutor}
                            className="text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="editTutorLastName" className="text-xs font-semibold">Apellido del Tutor *</Label>
                          <Input
                            id="editTutorLastName"
                            value={editTutorLastName}
                            onChange={(e) => setEditTutorLastName(e.target.value)}
                            required={editingIsMinor || editHasTutor}
                            className="text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="editTutorCi" className="text-xs font-semibold">Cédula del Tutor (CI) *</Label>
                          <Input
                            id="editTutorCi"
                            value={editTutorCi}
                            onChange={(e) => setEditTutorCi(e.target.value)}
                            required={editingIsMinor || editHasTutor}
                            className="text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="editTutorPhone" className="text-xs font-semibold">Teléfono / Celular *</Label>
                          <Input
                            id="editTutorPhone"
                            value={editTutorPhone}
                            onChange={(e) => setEditTutorPhone(e.target.value)}
                            required={editingIsMinor || editHasTutor}
                            placeholder="Ej. 0981234567"
                            className="text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="editTutorEmail" className="text-xs font-semibold">Correo Electrónico</Label>
                        <Input
                          id="editTutorEmail"
                          type="email"
                          value={editTutorEmail}
                          onChange={(e) => setEditTutorEmail(e.target.value)}
                          placeholder="tutor@ejemplo.com"
                          className="text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Biometric Consent */}
                <div className="flex items-start gap-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
                  <Checkbox
                    id="editBiometricConsent"
                    checked={editBiometricConsent}
                    onChange={(e) => setEditBiometricConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="editBiometricConsent" className="text-xs font-bold text-amber-900 cursor-pointer block leading-snug">
                      Consentimiento de Biometría Facial
                    </label>
                    <p className="text-[10px] text-amber-800 leading-normal">
                      Autorización formal del alumno o tutor legal para el procesamiento biométrico en los accesos.
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0 border-t border-slate-100 bg-slate-50/50">
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} className="text-xs">
                  Cancelar
                </Button>
                <Button type="submit" disabled={editLoading} className="text-xs font-semibold">
                  {editLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Face Enrollment Modal */}
      <FaceEnrollmentModal
        student={enrollingStudent}
        isOpen={Boolean(enrollingStudent)}
        onClose={() => setEnrollingStudent(null)}
        onFaceUpdated={loadStudents}
      />
    </div>
  );
}

