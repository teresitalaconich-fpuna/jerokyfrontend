"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../../components/ui/dialog";
import { fetchApi, ensureAuth } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth-context";
import { ShieldAlert, AlertTriangle, FileArchive, History } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  username: string;
  ipAddress: string;
  details: string;
}

export default function SistemaPage() {
  const { user } = useAuth();
  const role = user?.role || null;
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [intervalMin, setIntervalMin] = useState(1440); // 1 day in minutes

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadInitialData = React.useCallback(async () => {
    try {
      await ensureAuth();
      const [auditData, intervalData] = await Promise.all([
        fetchApi<AuditLog[]>("/audit").catch(() => []),
        fetchApi<{ intervalMinutes: number }>("/system/backup/interval").catch(() => null),
      ]);

      setAudits(Array.isArray(auditData) ? auditData : []);
      if (intervalData?.intervalMinutes) {
        setIntervalMin(intervalData.intervalMinutes);
      }
    } catch {
      setAudits([]);
    }
  }, []);

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

  const triggerBackup = async () => {
    setBackupLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    setIsBackupModalOpen(false);

    try {
      const res = await fetchApi<{ filename: string }>("/system/backup", { method: "POST" });
      setSuccessMsg(`Respaldo creado con éxito: ${res.filename}`);
      loadInitialData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al generar respaldo de base de datos";
      setErrorMsg(msg);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSaveInterval = async () => {
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await fetchApi("/system/backup/interval", {
        method: "POST",
        body: JSON.stringify({ minutes: Number(intervalMin) }),
      });
      setSuccessMsg("Intervalo de respaldo automatizado actualizado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar intervalo de respaldo";
      setErrorMsg(msg);
    }
  };

  // RBAC Client check
  const isAuthorized = role === "Administrator";
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white border border-slate-200 rounded-xl shadow-lg space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground">
          Esta sección está restringida únicamente para el **Administrador** del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Mantenimiento y Auditoría</h1>
        <p className="text-sm text-muted-foreground">Respaldos de base de datos y trazabilidad estricta de auditoría del sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backups Card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileArchive className="h-6 w-6 text-accent" />
              <CardTitle>Respaldos de Base de Datos</CardTitle>
            </div>
            <CardDescription>Resguarde el estado del sistema en archivos SQL estructurados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {successMsg && (
              <div className="p-3 text-xs text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-200">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 text-xs text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="interval">Intervalo de Respaldo Automático (Minutos)</Label>
              <div className="flex gap-2">
                <Input
                  id="interval"
                  type="number"
                  value={intervalMin}
                  onChange={(e) => setIntervalMin(Number(e.target.value))}
                />
                <Button variant="outline" onClick={handleSaveInterval}>
                  Guardar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">1440 minutos equivale a 24 horas.</p>
            </div>

            <div className="pt-2">
              <Button 
                onClick={() => setIsBackupModalOpen(true)}
                disabled={backupLoading}
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold"
              >
                GENERAR BACKUP MANUAL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Trail Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Rastro de Auditoría (Audit Trails)</CardTitle>
                <CardDescription>Eventos registrados con IP y usuario ejecutor para cumplimiento normativo.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto border border-slate-100 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acción</TableHead>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Dirección IP</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-bold text-xs text-primary">{log.action}</TableCell>
                      <TableCell className="text-xs">{new Date(log.timestamp).toLocaleString("es-PY")}</TableCell>
                      <TableCell className="text-xs">{log.username || "System"}</TableCell>
                      <TableCell className="text-xs font-mono">{log.ipAddress}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Backup Modal */}
      <Dialog open={isBackupModalOpen} onOpenChange={setIsBackupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle>Confirmar Respaldo Manual</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea disparar la creación de un nuevo respaldo SQL? Esto volcará todas las tablas (Alumnos, Calificaciones, Auditorías, etc.) en un archivo físico de seguridad.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBackupModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={triggerBackup} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Sí, Generar Respaldo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
