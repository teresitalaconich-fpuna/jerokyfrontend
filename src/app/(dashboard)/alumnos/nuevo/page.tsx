"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Select } from "../../../../components/ui/select";
import { fetchApi, ensureAuth } from "../../../../lib/api";
import { Camera, CheckCircle2, ArrowRight } from "lucide-react";
import FaceEnrollmentModal from "../../../../components/biometrics/FaceEnrollmentModal";

interface CreatedStudent {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  biometricTemplateId?: string | null;
}

interface TutorOption {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  phone: string;
  email: string;
}

export default function NuevoAlumnoPage() {
  const router = useRouter();
  
  // Student fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ci, setCi] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [medicalInfo, setMedicalInfo] = useState("");
  const [biometricConsent, setBiometricConsent] = useState(false);

  // Tutor fields (shown if minor)
  const [tutorMode, setTutorMode] = useState<"new" | "existing">("new");
  const [existingTutors, setExistingTutors] = useState<TutorOption[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [tutorFirstName, setTutorFirstName] = useState("");
  const [tutorLastName, setTutorLastName] = useState("");
  const [tutorCi, setTutorCi] = useState("");
  const [tutorPhone, setTutorPhone] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [createdStudent, setCreatedStudent] = useState<CreatedStudent | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchTutors = async () => {
      try {
        await ensureAuth();
        const tutors = await fetchApi<TutorOption[]>("/students/info/tutors");
        if (active && tutors && tutors.length > 0) {
          setExistingTutors(tutors);
          setSelectedTutorId(tutors[0].id);
        }
      } catch {
        // ignore
      }
    };

    fetchTutors();

    return () => {
      active = false;
    };
  }, []);

  // Compute age and minor status when birthdate changes
  const isMinor = React.useMemo(() => {
    if (!birthDate) {
      return false;
    }
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age < 18;
  }, [birthDate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

    // Student validation
    if (!firstName || firstName.length < 3 || firstName.length > 30 || !nameRegex.test(firstName)) {
      newErrors.firstName = "Nombre inválido (letras, 3-30 caracteres)";
    }
    if (!lastName || lastName.length < 3 || lastName.length > 30 || !nameRegex.test(lastName)) {
      newErrors.lastName = "Apellido inválido (letras, 3-30 caracteres)";
    }
    if (!ci || !/^\d{6,15}$/.test(ci)) {
      newErrors.ci = "La CI debe ser numérica con un mínimo de 6 dígitos";
    }
    if (!birthDate) {
      newErrors.birthDate = "La fecha de nacimiento es obligatoria";
    }

    // Tutor validation if minor
    if (isMinor) {
      if (tutorMode === "existing") {
        if (!selectedTutorId) {
          newErrors.selectedTutorId = "Debe seleccionar un tutor existente";
        }
      } else {
        if (!tutorFirstName || tutorFirstName.length < 3 || tutorFirstName.length > 30 || !nameRegex.test(tutorFirstName)) {
          newErrors.tutorFirstName = "Nombre del tutor inválido (letras, 3-30 caracteres)";
        }
        if (!tutorLastName || tutorLastName.length < 3 || tutorLastName.length > 30 || !nameRegex.test(tutorLastName)) {
          newErrors.tutorLastName = "Apellido del tutor inválido (letras, 3-30 caracteres)";
        }
        if (!tutorCi || !/^\d{6,15}$/.test(tutorCi)) {
          newErrors.tutorCi = "La CI del tutor debe ser numérica (mínimo 6 dígitos)";
        }
        if (!tutorPhone || !/^\d{6,13}$/.test(tutorPhone)) {
          newErrors.tutorPhone = "El teléfono del tutor debe ser numérico (6-13 dígitos)";
        }
        if (!tutorEmail || !/\S+@\S+\.\S+/.test(tutorEmail)) {
          newErrors.tutorEmail = "Debe ingresar un email de tutor válido";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSuccess("");
    try {
      const payload = {
        firstName,
        lastName,
        ci,
        birthDate,
        encryptedMedicalInfo: medicalInfo || undefined,
        biometricConsent,
        ...(isMinor
          ? tutorMode === "existing"
            ? { tutorId: selectedTutorId }
            : {
                tutor: {
                  firstName: tutorFirstName,
                  lastName: tutorLastName,
                  ci: tutorCi,
                  phone: tutorPhone,
                  email: tutorEmail,
                },
              }
          : {}),
      };

      const created = await fetchApi<CreatedStudent>("/students", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess("¡Estudiante registrado correctamente!");
      setCreatedStudent(created);

      // Reset form
      setFirstName("");
      setLastName("");
      setCi("");
      setBirthDate("");
      setMedicalInfo("");
      setBiometricConsent(false);
      setTutorFirstName("");
      setTutorLastName("");
      setTutorCi("");
      setTutorPhone("");
      setTutorEmail("");

    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar el registro";
      setErrors({ global: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registro de Nuevo Alumno</CardTitle>
          <CardDescription>
            Ingrese los datos personales del alumno para el proceso de inscripción.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errors.global && (
              <div className="p-3 text-sm text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive">
                {errors.global}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-200">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. María"
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Gómez"
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="ci">Cédula de Identidad (CI) *</Label>
                <Input
                  id="ci"
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                  placeholder="Ej. 1234567"
                />
                {errors.ci && <p className="text-xs text-destructive">{errors.ci}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="birthDate">Fecha de Nacimiento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="medicalInfo">Información Médica / Requerimiento Especial (Sensible)</Label>
              <textarea
                id="medicalInfo"
                value={medicalInfo}
                onChange={(e) => setMedicalInfo(e.target.value)}
                placeholder="Indique alguna alergia o contraindicación física..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Biometric Consent Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-lg">
              <Checkbox
                id="biometricConsent"
                checked={biometricConsent}
                onChange={(e) => setBiometricConsent(e.target.checked)}
                className="mt-1"
              />
              <div className="space-y-1">
                <label htmlFor="biometricConsent" className="text-xs font-bold text-amber-900 cursor-pointer block leading-snug">
                  Consentimiento Informado de Biometría Facial *
                </label>
                <p className="text-[11px] text-amber-800 leading-normal">
                  Autorizo de forma expresa el almacenamiento cifrado y procesamiento de la plantilla biométrica facial del estudiante para el registro automatizado de asistencia y control de acceso seguro en la academia.
                </p>
              </div>
            </div>

            {/* Minor / Tutor Link Conditional Section */}
            {isMinor && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-primary">Información del Padre, Madre o Tutor Legal</h3>
                    <p className="text-xs text-muted-foreground">
                      El alumno tiene menos de 18 años. Se requiere vincular un tutor legal.
                    </p>
                  </div>
                  {existingTutors.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={tutorMode === "new" ? "default" : "outline"}
                        onClick={() => setTutorMode("new")}
                      >
                        Crear Nuevo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={tutorMode === "existing" ? "default" : "outline"}
                        onClick={() => setTutorMode("existing")}
                      >
                        Seleccionar Existente
                      </Button>
                    </div>
                  )}
                </div>

                {tutorMode === "existing" && existingTutors.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Seleccionar Tutor Registrado</Label>
                    <Select
                      value={selectedTutorId}
                      onChange={(e) => setSelectedTutorId(e.target.value)}
                    >
                      {existingTutors.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName} (CI: {t.ci} - Tel: {t.phone})
                        </option>
                      ))}
                    </Select>
                    {errors.selectedTutorId && (
                      <p className="text-xs text-destructive">{errors.selectedTutorId}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="tutorFirstName">Nombre del Tutor *</Label>
                        <Input
                          id="tutorFirstName"
                          value={tutorFirstName}
                          onChange={(e) => setTutorFirstName(e.target.value)}
                        />
                        {errors.tutorFirstName && <p className="text-xs text-destructive">{errors.tutorFirstName}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tutorLastName">Apellido del Tutor *</Label>
                        <Input
                          id="tutorLastName"
                          value={tutorLastName}
                          onChange={(e) => setTutorLastName(e.target.value)}
                        />
                        {errors.tutorLastName && <p className="text-xs text-destructive">{errors.tutorLastName}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="tutorCi">CI del Tutor *</Label>
                        <Input
                          id="tutorCi"
                          value={tutorCi}
                          onChange={(e) => setTutorCi(e.target.value)}
                        />
                        {errors.tutorCi && <p className="text-xs text-destructive">{errors.tutorCi}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tutorPhone">Celular del Tutor *</Label>
                        <Input
                          id="tutorPhone"
                          value={tutorPhone}
                          onChange={(e) => setTutorPhone(e.target.value)}
                          placeholder="Ej. 0981234567"
                        />
                        {errors.tutorPhone && <p className="text-xs text-destructive">{errors.tutorPhone}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="tutorEmail">Correo Electrónico del Tutor *</Label>
                      <Input
                        id="tutorEmail"
                        value={tutorEmail}
                        onChange={(e) => setTutorEmail(e.target.value)}
                        placeholder="tutor@gmail.com"
                      />
                      {errors.tutorEmail && <p className="text-xs text-destructive">{errors.tutorEmail}</p>}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/alumnos")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Guardar Alumno"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Post-Registration Action Dialog */}
      {createdStudent && !showFaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl bg-white border-2 border-emerald-500 overflow-hidden">
            <CardHeader className="bg-emerald-50 text-center pb-4 border-b border-emerald-100">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                ¡Alumno Registrado con Éxito!
              </CardTitle>
              <CardDescription className="text-slate-600 text-xs">
                {createdStudent.firstName} {createdStudent.lastName} (CI: {createdStudent.ci})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-center">
              <p className="text-sm text-slate-700 leading-relaxed">
                Para habilitar la asistencia automática en el punto de acceso, capture una muestra del rostro del alumno.
              </p>
              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  onClick={() => setShowFaceModal(true)}
                  className="w-full py-6 font-bold text-sm bg-accent hover:bg-accent/90 text-white flex items-center justify-center gap-2 shadow-md"
                >
                  <Camera className="h-5 w-5" /> Capturar Rostro con Cámara Ahora
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/alumnos")}
                  className="w-full text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 text-xs"
                >
                  Ir al Listado de Alumnos <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Face Enrollment Modal */}
      {createdStudent && (
        <FaceEnrollmentModal
          student={createdStudent}
          isOpen={showFaceModal}
          onClose={() => {
            setShowFaceModal(false);
            router.push("/alumnos");
          }}
          onFaceUpdated={() => {
            setShowFaceModal(false);
            router.push("/alumnos");
          }}
        />
      )}
    </div>
  );
}
