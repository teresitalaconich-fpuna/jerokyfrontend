"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../components/ui/table";
import { fetchApi, ensureAuth } from "../../../lib/api";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Bell,
  Search,
  RefreshCw,
} from "lucide-react";

interface Course {
  id: string;
  name: string;
  level: string;
}

interface CommLog {
  id: string;
  sentAt: string;
  channel: string;
  status: string;
  errorMessage?: string | null;
  externalId?: string | null;
  recipientDescription?: string | null;
  recipientEmail?: string;
  recipientName?: string;
  recipientRole?: string;
  recipient?: {
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  } | null;
  communication?: {
    subject: string;
  };
}

export default function ComunicacionesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Target Audience roles
  const [targetAdmin, setTargetAdmin] = useState(false);
  const [targetDocente, setTargetDocente] = useState(false);
  const [targetOperador, setTargetOperador] = useState(false);
  const [targetAlumno, setTargetAlumno] = useState(false);
  const [targetTutor, setTargetTutor] = useState(true);

  // Channels
  const [channelWeb, setChannelWeb] = useState(false);
  const [channelEmail, setChannelEmail] = useState(true);

  const [logs, setLogs] = useState<CommLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const loadData = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await ensureAuth();
      const [loadedCourses, loadedLogs] = await Promise.all([
        fetchApi<Course[]>("/courses").catch(() => []),
        fetchApi<CommLog[]>("/communications/logs").catch(() => []),
      ]);
      setCourses(Array.isArray(loadedCourses) ? loadedCourses : []);
      setLogs(Array.isArray(loadedLogs) ? loadedLogs : []);
    } catch {
      setLogs([]);
    } finally {
      setRefreshing(false);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !body) {
      setError("Asunto y Cuerpo son obligatorios");
      return;
    }

    if (subject.length > 250) {
      setError("El asunto no puede exceder los 250 caracteres");
      return;
    }

    if (body.length > 2000) {
      setError("El cuerpo no puede exceder los 2000 caracteres");
      return;
    }

    const targetRoles: string[] = [];
    if (targetAdmin) targetRoles.push("Administrator");
    if (targetDocente) targetRoles.push("Docente");
    if (targetOperador) targetRoles.push("Operador");
    if (targetAlumno) targetRoles.push("Alumno");
    if (targetTutor) targetRoles.push("Tutor");

    if (targetRoles.length === 0) {
      setError("Debe seleccionar al menos un rol de audiencia");
      return;
    }

    const channels: string[] = [];
    if (channelWeb) channels.push("Web");
    if (channelEmail) channels.push("Email");

    if (channels.length === 0) {
      setError("Debe seleccionar al menos un canal de comunicación");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetchApi<{
        communication: any;
        summary: {
          totalRecipients: number;
          emailDispatches: { total: number; delivered: number; failed: number };
          webDispatches: { total: number; delivered: number };
        };
      }>("/communications", {
        method: "POST",
        body: JSON.stringify({
          subject,
          body,
          targetRoles,
          channels,
          courseId: selectedCourse || undefined,
        }),
      });

      const summary = response?.summary;
      if (summary) {
        const emailMsg = channels.includes("Email")
          ? `Correos: ${summary.emailDispatches.delivered} entregados${summary.emailDispatches.failed > 0 ? `, ${summary.emailDispatches.failed} fallidos` : ""}`
          : "";
        const webMsg = channels.includes("Web")
          ? `Notificaciones web: ${summary.webDispatches.delivered}`
          : "";
        const details = [emailMsg, webMsg].filter(Boolean).join(" | ");

        setSuccess(`Comunicado emitido exitosamente a ${summary.totalRecipients} destinatario(s). (${details})`);
      } else {
        setSuccess("Comunicado emitido y registrado exitosamente.");
      }

      setSubject("");
      setBody("");
      loadData();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al emitir comunicado";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado reactivo de logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const name =
        log.recipientName ||
        (log.recipient
          ? `${log.recipient.firstName || ""} ${log.recipient.lastName || ""}`.trim()
          : "") ||
        "";
      const email = log.recipientEmail || log.recipient?.email || "";
      const subj = log.communication?.subject || "";
      const desc = log.recipientDescription || "";

      const matchesSearch =
        searchTerm === "" ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subj.toLowerCase().includes(searchTerm.toLowerCase()) ||
        desc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesChannel =
        filterChannel === "all" ||
        log.channel.toLowerCase() === filterChannel.toLowerCase();

      const matchesStatus =
        filterStatus === "all" ||
        log.status.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [logs, searchTerm, filterChannel, filterStatus]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario de Emisión */}
      <Card className="lg:col-span-1 h-fit shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Enviar Comunicado
          </CardTitle>
          <CardDescription className="text-xs">
            Difusión masiva segmentada por roles, cursos y canales oficiales.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSend}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-100/90 rounded-lg border border-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Segmentar por Curso</Label>
              <Select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Todos los Cursos (General)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.level}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="subject" className="text-xs">
                  Asunto *
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {subject.length}/250
                </span>
              </div>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Convocatoria a Ensayo General"
                maxLength={250}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="body" className="text-xs">
                  Cuerpo del Mensaje *
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {body.length}/2000
                </span>
              </div>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Redacte su comunicado aquí..."
                className="flex min-h-[130px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                maxLength={2000}
              />
            </div>

            {/* Audiencia Objetivo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Audiencia Objetivo *
              </Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="role-tutor"
                    checked={targetTutor}
                    onChange={(e) => setTargetTutor(e.target.checked)}
                  />
                  <label
                    htmlFor="role-tutor"
                    className="text-xs font-semibold cursor-pointer select-none"
                  >
                    Tutores (Padres)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="role-alumno"
                    checked={targetAlumno}
                    onChange={(e) => setTargetAlumno(e.target.checked)}
                  />
                  <label
                    htmlFor="role-alumno"
                    className="text-xs font-semibold cursor-pointer select-none"
                  >
                    Alumnos
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="role-docente"
                    checked={targetDocente}
                    onChange={(e) => setTargetDocente(e.target.checked)}
                  />
                  <label
                    htmlFor="role-docente"
                    className="text-xs font-semibold cursor-pointer select-none"
                  >
                    Docentes
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="role-operador"
                    checked={targetOperador}
                    onChange={(e) => setTargetOperador(e.target.checked)}
                  />
                  <label
                    htmlFor="role-operador"
                    className="text-xs font-semibold cursor-pointer select-none"
                  >
                    Operadores
                  </label>
                </div>
                <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-slate-200">
                  <Checkbox
                    id="role-admin"
                    checked={targetAdmin}
                    onChange={(e) => setTargetAdmin(e.target.checked)}
                  />
                  <label
                    htmlFor="role-admin"
                    className="text-xs font-semibold cursor-pointer select-none"
                  >
                    Administradores
                  </label>
                </div>
              </div>
            </div>

            {/* Canales de Salida */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Canales de Salida *</Label>
              <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="channel-email"
                    checked={channelEmail}
                    onChange={(e) => setChannelEmail(e.target.checked)}
                  />
                  <label
                    htmlFor="channel-email"
                    className="text-xs font-semibold cursor-pointer select-none flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-indigo-600" /> Correo Electrónico
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="channel-web"
                    checked={channelWeb}
                    onChange={(e) => setChannelWeb(e.target.checked)}
                  />
                  <label
                    htmlFor="channel-web"
                    className="text-xs font-semibold cursor-pointer select-none flex items-center gap-1.5"
                  >
                    <Bell className="h-3.5 w-3.5 text-blue-600" /> Notificación Web
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2 shadow-sm"
              disabled={loading}
            >
              <Send className="h-4 w-4" />{" "}
              {loading ? "Enviando..." : "Enviar Comunicado"}
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* Tabla de Registros de Entrega */}
      <Card className="lg:col-span-2 shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Registro de Entregas</CardTitle>
              <CardDescription className="text-xs">
                Trazabilidad inmutable de comunicaciones emitidas y entregadas.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={refreshing}
              className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          </div>

          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o asunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <Select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="text-xs h-8"
            >
              <option value="all">Todos los Canales</option>
              <option value="email">Solo Correo</option>
              <option value="web">Solo Web</option>
            </Select>

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs h-8"
            >
              <option value="all">Todos los Estados</option>
              <option value="delivered">Entregados</option>
              <option value="failed">Fallidos</option>
              <option value="sent">Enviados</option>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="text-xs font-semibold">Fecha y Hora</TableHead>
                <TableHead className="text-xs font-semibold">Asunto</TableHead>
                <TableHead className="text-xs font-semibold">Destinatario</TableHead>
                <TableHead className="text-xs font-semibold">Email</TableHead>
                <TableHead className="text-xs font-semibold">Rol</TableHead>
                <TableHead className="text-xs font-semibold">Canal</TableHead>
                <TableHead className="text-xs font-semibold">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    No se encontraron registros de comunicaciones.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const name =
                    log.recipientName ||
                    (log.recipient
                      ? `${log.recipient.firstName || ""} ${log.recipient.lastName || ""}`.trim()
                      : "") ||
                    log.recipientEmail ||
                    "-";
                  const email =
                    log.recipientEmail || log.recipient?.email || "-";
                  const role =
                    log.recipientRole || log.recipient?.role || "Tutor";
                  const isFailed = log.status === "failed";
                  const isDelivered = log.status === "delivered";

                  return (
                    <TableRow key={log.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs whitespace-nowrap text-slate-600">
                        {new Date(log.sentAt).toLocaleString("es-PY", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell
                        className="text-xs font-medium text-slate-800 max-w-[150px] truncate"
                        title={log.communication?.subject}
                      >
                        {log.communication?.subject || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">
                          {name}
                        </div>
                        {log.recipientDescription && (
                          <div
                            className="text-[10px] text-slate-500 line-clamp-1"
                            title={log.recipientDescription}
                          >
                            {log.recipientDescription}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">
                        {email}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {role}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.channel === "Email" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50">
                            <Mail className="h-3 w-3" /> Correo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50">
                            <Bell className="h-3 w-3" /> Web
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Entregado
                          </span>
                        )}
                        {isFailed && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 w-fit">
                              <AlertCircle className="h-3 w-3 text-rose-600" /> Fallido
                            </span>
                            {log.errorMessage && (
                              <span
                                className="text-[10px] text-rose-600 font-medium line-clamp-2 max-w-[180px]"
                                title={log.errorMessage}
                              >
                                {log.errorMessage}
                              </span>
                            )}
                          </div>
                        )}
                        {!isDelivered && !isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Clock className="h-3 w-3 text-amber-600" /> Enviado
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
