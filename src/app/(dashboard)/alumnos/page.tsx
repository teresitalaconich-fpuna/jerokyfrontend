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
import { Card, CardHeader, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { fetchApi, ensureAuth } from "../../../lib/api";
import { Plus, Search, Eye } from "lucide-react";

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  birthDate: string;
  biometricConsent: boolean;
  biometricTemplateId: string | null;
  tutor?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

const mockStudents: StudentData[] = [
  {
    id: "s1",
    firstName: "Sofía",
    lastName: "Ayala",
    ci: "5423891",
    birthDate: "2010-04-12",
    biometricConsent: true,
    biometricTemplateId: "face-sofia-123",
    tutor: { firstName: "Carlos", lastName: "Ayala", phone: "0981223344" }
  },
  {
    id: "s2",
    firstName: "Mateo",
    lastName: "Paredes",
    ci: "6021453",
    birthDate: "2012-08-20",
    biometricConsent: true,
    biometricTemplateId: null,
    tutor: { firstName: "Elena", lastName: "Paredes", phone: "0982556677" }
  },
  {
    id: "s3",
    firstName: "Valentina",
    lastName: "Giménez",
    ci: "4982310",
    birthDate: "2005-11-03",
    biometricConsent: false,
    biometricTemplateId: null,
  }
];

export default function AlumnosPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStudents = React.useCallback(async () => {
    setLoading(true);
    try {
      await ensureAuth();
      const data = await fetchApi<StudentData[]>("/students");
      if (data && data.length > 0) {
        setStudents(data);
      } else {
        setStudents(mockStudents);
      }
    } catch {
      console.warn("Using mock student data");
      setStudents(mockStudents);
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
          <p className="text-sm text-muted-foreground">Listado general de alumnos registrados en el sistema.</p>
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
                  <TableHead>Biometría</TableHead>
                  <TableHead>Tutor Vinculado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-semibold text-slate-800">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.ci}</TableCell>
                    <TableCell>{new Date(student.birthDate).toLocaleDateString("es-PY")}</TableCell>
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
                      <div className="flex justify-end gap-2">
                        <Link href={`/historial/${student.id}`}>
                          <Button size="sm" variant="outline" className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Historial
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
