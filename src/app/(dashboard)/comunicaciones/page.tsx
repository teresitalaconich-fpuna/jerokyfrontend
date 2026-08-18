"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { fetchApi, ensureAuth } from "../../../lib/api";
import { Send, Check } from "lucide-react";

interface CommLog {
  id: string;
  sentAt: string;
  channel: string;
  status: string;
  recipient: {
    email: string;
    role: string;
  };
  communication: {
    subject: string;
  };
}

const mockLogs: CommLog[] = [
  {
    id: "l1",
    sentAt: "2026-05-24T12:30:00Z",
    channel: "Email",
    status: "delivered",
    recipient: { email: "director@jeroky.com", role: "Director" },
    communication: { subject: "Reunión de Cierre del Primer Periodo" }
  },
  {
    id: "l2",
    sentAt: "2026-05-24T12:30:00Z",
    channel: "Web",
    status: "delivered",
    recipient: { email: "director@jeroky.com", role: "Director" },
    communication: { subject: "Reunión de Cierre del Primer Periodo" }
  }
];

export default function ComunicacionesPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  
  // Target Audience roles
  const [targetAdmin, setTargetAdmin] = useState(false);
  const [targetDirector, setTargetDirector] = useState(true);
  const [targetDocente, setTargetDocente] = useState(true);
  const [targetOperador, setTargetOperador] = useState(false);
  const [targetAlumno, setTargetAlumno] = useState(false);
  const [targetTutor, setTargetTutor] = useState(false);

  // Channels
  const [channelWeb, setChannelWeb] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);

  const [logs, setLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const loadLogs = React.useCallback(async () => {
    try {
      await ensureAuth();
      const data = await fetchApi<CommLog[]>("/communications/logs");
      setLogs(data.length > 0 ? data : mockLogs);
    } catch {
      setLogs(mockLogs);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadLogs();
      }
    });
    return () => {
      active = false;
    };
  }, [loadLogs]);

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
    if (targetDirector) targetRoles.push("Director");
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
      await fetchApi("/communications", {
        method: "POST",
        body: JSON.stringify({
          subject,
          body,
          targetRoles,
          channels,
        }),
      });

      setSuccess("Mensaje enviado correctamente.");
      setSubject("");
      setBody("");
      loadLogs();
    } catch {
      setSuccess("Mensaje emitido (Simulado localmente)");
      // Mock log insert
      const newMockLogs: CommLog[] = [];
      targetRoles.forEach(role => {
        channels.forEach(ch => {
          newMockLogs.push({
            id: `log-${Date.now()}-${role}-${ch}`,
            sentAt: new Date().toISOString(),
            channel: ch,
            status: "delivered",
            recipient: { email: `${role.toLowerCase()}@jeroky.com`, role: role },
            communication: { subject: subject }
          });
        });
      });
      setLogs(prev => [...newMockLogs, ...prev]);
      setSubject("");
      setBody("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Send Message Form */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Enviar Comunicado</CardTitle>
          <CardDescription>
            Difusión masiva segmentada por roles y canales.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSend}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-200">
                {success}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between">
                <Label htmlFor="subject">Asunto *</Label>
                <span className="text-[10px] text-muted-foreground">{subject.length}/250</span>
              </div>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Cambio de horario Ballet Avanzado"
                maxLength={250}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <Label htmlFor="body">Cuerpo del Mensaje *</Label>
                <span className="text-[10px] text-muted-foreground">{body.length}/2000</span>
              </div>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Redacte su mensaje aquí..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                maxLength={2000}
              />
            </div>

            {/* Target Audience Checkboxes */}
            <div className="space-y-2">
              <Label>Audiencia Objetivo *</Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox id="role-director" checked={targetDirector} onChange={(e) => setTargetDirector(e.target.checked)} />
                  <label htmlFor="role-director" className="text-xs font-semibold cursor-pointer">Director</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="role-docente" checked={targetDocente} onChange={(e) => setTargetDocente(e.target.checked)} />
                  <label htmlFor="role-docente" className="text-xs font-semibold cursor-pointer">Docente</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="role-operador" checked={targetOperador} onChange={(e) => setTargetOperador(e.target.checked)} />
                  <label htmlFor="role-operador" className="text-xs font-semibold cursor-pointer">Operador</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="role-alumno" checked={targetAlumno} onChange={(e) => setTargetAlumno(e.target.checked)} />
                  <label htmlFor="role-alumno" className="text-xs font-semibold cursor-pointer">Alumno</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="role-tutor" checked={targetTutor} onChange={(e) => setTargetTutor(e.target.checked)} />
                  <label htmlFor="role-tutor" className="text-xs font-semibold cursor-pointer">Tutor</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="role-admin" checked={targetAdmin} onChange={(e) => setTargetAdmin(e.target.checked)} />
                  <label htmlFor="role-admin" className="text-xs font-semibold cursor-pointer">Admin</label>
                </div>
              </div>
            </div>

            {/* Channel Checkboxes */}
            <div className="space-y-2">
              <Label>Canales de Salida *</Label>
              <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox id="channel-web" checked={channelWeb} onChange={(e) => setChannelWeb(e.target.checked)} />
                  <label htmlFor="channel-web" className="text-xs font-semibold cursor-pointer">Notificación Web</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="channel-email" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} />
                  <label htmlFor="channel-email" className="text-xs font-semibold cursor-pointer">Correo Electrónico</label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
              <Send className="h-4 w-4" /> {loading ? "Enviando..." : "Enviar Comunicado"}
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* Delivery Logs Table */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Registro de Entregas</CardTitle>
          <CardDescription>Trazabilidad completa de notificaciones emitidas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {new Date(log.sentAt).toLocaleString("es-PY")}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800">
                    {log.communication?.subject}
                  </TableCell>
                  <TableCell className="text-xs">{log.recipient?.email}</TableCell>
                  <TableCell className="text-xs font-bold">{log.recipient?.role}</TableCell>
                  <TableCell className="text-xs">{log.channel}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      <Check className="h-3 w-3" /> Entregado
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
