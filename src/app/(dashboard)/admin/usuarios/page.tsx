"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { fetchApi, ensureAuth } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth-context";
import { Shield, ShieldAlert, UserPlus, Power, Edit } from "lucide-react";

interface UserInfo {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const role = user?.role || null;
  const [users, setUsers] = useState<UserInfo[]>([]);

  // New user form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("password123");
  const [selectedRole, setSelectedRole] = useState("Docente");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const loadUsers = React.useCallback(async () => {
    try {
      await ensureAuth();
      const data = await fetchApi<UserInfo[]>("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadUsers();
      }
    });
    return () => {
      active = false;
    };
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName || !password) {
      setError("Rellene todos los campos requeridos (la contraseña es obligatoria)");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña inicial debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await fetchApi("/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          role: selectedRole,
          password,
        }),
      });

      setSuccess("Usuario creado correctamente.");
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
      loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al registrar usuario";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (u: UserInfo) => {
    setEditingUser(u);
    setEditFirstName(u.firstName);
    setEditLastName(u.lastName);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editEmail || !editFirstName || !editLastName) {
      setEditError("Todos los campos son obligatorios");
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      await fetchApi(`/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          role: editRole,
        }),
      });

      setEditingUser(null);
      loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar usuario";
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (u: UserInfo) => {
    const newStatus = !u.isActive;
    const actionText = newStatus ? "reactivar" : "inactivar";
    if (!window.confirm(`¿Está seguro de que desea ${actionText} a ${u.firstName} ${u.lastName}?`)) {
      return;
    }

    try {
      await fetchApi(`/users/${u.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      });
      loadUsers();
    } catch {
      setUsers(prev => prev.map(item => item.id === u.id ? { ...item, isActive: newStatus } : item));
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create User Card */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            <CardTitle>Registrar Usuario</CardTitle>
          </div>
          <CardDescription>
            De de alta nuevos usuarios operadores y asigne privilegios RBAC.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateUser}>
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
              <Label htmlFor="firstName">Nombre *</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@jeroky.com" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Contraseña Inicial *</Label>
              <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>

            <div className="space-y-1">
              <Label>Rol del Sistema *</Label>
              <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="Administrator">Administrador</option>
                <option value="Docente">Docente</option>
                <option value="Operador">Operador (Usuario Administrativo)</option>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrando..." : "Crear Usuario"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Users Table */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Usuarios Registrados</CardTitle>
              <CardDescription>Listado y asignación de privilegios RBAC.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Asignado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={!u.isActive ? "opacity-60 bg-slate-50/50" : ""}>
                  <TableCell className="font-semibold text-slate-800">{u.firstName} {u.lastName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="text-xs font-bold text-primary">{u.role}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}>
                      {u.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs flex items-center gap-1 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleOpenEdit(u)}
                      >
                        <Edit className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 px-2 text-xs flex items-center gap-1 ${
                          u.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        onClick={() => handleToggleActive(u)}
                      >
                        <Power className="h-3.5 w-3.5" /> {u.isActive ? "Inactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-slate-200">
          <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-slate-100">
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800">Editar Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1">
            <div className="space-y-4 p-4 sm:p-6">
              {editError && (
                <div className="p-3 text-xs text-destructive-foreground bg-destructive/15 rounded-lg border border-destructive">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

              <div className="space-y-1">
                <Label htmlFor="editEmail">Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Rol del Sistema *</Label>
                <Select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  <option value="Administrator">Administrador</option>
                  <option value="Docente">Docente</option>
                  <option value="Operador">Operador (Usuario Administrativo)</option>
                </Select>
              </div>
            </div>
            <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-slate-100 bg-slate-50/50">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
