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
import { Plus, Search, Eye, Edit, Power, X } from "lucide-react";

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

export default function AlumnosPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCi, setEditCi] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editMedicalInfo, setEditMedicalInfo] = useState("");
  const [editBiometricConsent, setEditBiometricConsent] = useState(false);
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
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (!editFirstName || !editLastName || !editCi || !editBirthDate) {
      setEditError("Por favor complete todos los campos obligatorios");
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      await fetchApi(`/students/${editingStudent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          ci: editCi,
          birthDate: editBirthDate,
          encryptedMedicalInfo: editMedicalInfo || undefined,
          biometricConsent: editBiometricConsent,
        }),
      });

      setEditingStudent(null);
      loadStudents();
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

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const ciMatch = student.ci.includes(search);
    return fullName.includes(search.toLowerCase()) || ciMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Alumnos</h1>
          <p className="text-sm text-muted-foreground">Listado y gestión integral de alumnos registrados en el sistema.</p>
        </div>
        <Link href="/alumnos/nuevo">
          <Button className="flex items-center gap-2">
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
                onChange={(e) => setSearch(e.target.value)}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula (CI)</TableHead>
                  <TableHead>Fecha de Nacimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Biometría</TableHead>
                  <TableHead>Tutor Vinculado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const isActive = student.status !== "inactive";
                  return (
                    <TableRow key={student.id} className={!isActive ? "opacity-60 bg-slate-50/50" : ""}>
                      <TableCell className="font-semibold text-slate-800">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.ci}</TableCell>
                      <TableCell>{new Date(student.birthDate).toLocaleDateString("es-PY")}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}>
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          student.biometricTemplateId 
                            ? "bg-emerald-100 text-emerald-800" 
                            : student.biometricConsent 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-slate-100 text-slate-800"
                        }`}>
                          {student.biometricTemplateId ? "Enrolado" : student.biometricConsent ? "Consentimiento dado" : "Sin consentimiento"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {student.tutor ? (
                          <div>
                            <p className="text-sm font-medium">{student.tutor.firstName} {student.tutor.lastName}</p>
                            <p className="text-xs text-muted-foreground">{student.tutor.phone}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Mayor de edad / Sin tutor</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link href={`/historial/${student.id}`}>
                            <Button size="sm" variant="outline" className="h-8 px-2 flex items-center gap-1 text-xs" title="Ver Historial de Calificaciones">
                              <Eye className="h-3.5 w-3.5" /> Historial
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(student)}
                            title="Editar Datos del Alumno"
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
          )}
        </CardContent>
      </Card>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Editar Información del Alumno</CardTitle>
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleSaveEdit}>
              <CardContent className="space-y-4">
                {editError && (
                  <div className="p-3 text-xs text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="editFirstName">Nombre *</Label>
                    <Input
                      id="editFirstName"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="editLastName">Apellido *</Label>
                    <Input
                      id="editLastName"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="editCi">Cédula de Identidad *</Label>
                    <Input
                      id="editCi"
                      value={editCi}
                      onChange={(e) => setEditCi(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="editBirthDate">Fecha de Nacimiento *</Label>
                    <Input
                      id="editBirthDate"
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="editMedical">Información Médica / Alergias (Cifrada)</Label>
                  <textarea
                    id="editMedical"
                    value={editMedicalInfo}
                    onChange={(e) => setEditMedicalInfo(e.target.value)}
                    placeholder="Observaciones médicas..."
                    className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Checkbox
                    id="editBiometricConsent"
                    checked={editBiometricConsent}
                    onChange={(e) => setEditBiometricConsent(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <label htmlFor="editBiometricConsent" className="text-xs font-bold text-amber-900 cursor-pointer block leading-snug">
                      Consentimiento de Biometría Facial Aprobado
                    </label>
                    <p className="text-[10px] text-amber-800 leading-normal">
                      Autorización formal del alumno o tutor legal para el procesamiento biométrico en los accesos.
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
