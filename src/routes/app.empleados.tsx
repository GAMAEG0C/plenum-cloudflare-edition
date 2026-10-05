import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import {
  createEmployee,
  listEmployees,
  resetEmployeePassword,
  setEmployeeRole,
  setEmployeeStatus,
  type EmployeeRow,
} from "@/lib/employees-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EmployeeRole = "admin" | "manager" | "médico" | "auxiliar" | "empleado" | "recepción";

const roleLabels: Record<EmployeeRole, string> = {
  admin: "Admin",
  manager: "Manager",
  "médico": "Médico",
  auxiliar: "Auxiliar",
  empleado: "Empleado",
  "recepción": "Recepción",
};

export const Route = createFileRoute("/app/empleados")({
  component: EmpleadosPage,
});

function EmpleadosPage() {
  const { role, user } = useAuth();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [pwReset, setPwReset] = useState<EmployeeRow | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await listEmployees());
    } catch (e) {
      toast.error("No se pudieron cargar los empleados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") reload();
  }, [role]);

  if (role !== "admin") {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  const adminCount = rows.filter((r) => r.role === "admin").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            Administra los accesos al sistema. {rows.length} empleados registrados.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nuevo empleado
            </Button>
          </DialogTrigger>
          <CreateEmployeeDialog onClose={() => setCreateOpen(false)} onCreated={reload} />
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Cargando…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sin empleados.</TableCell></TableRow>
            ) : rows.map((r) => {
              const isSelf = r.id === user?.id;
              const isLastAdmin = r.role === "admin" && adminCount <= 1;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.employee_number}</TableCell>
                  <TableCell>{r.first_name} {r.last_name}</TableCell>
                  <TableCell>
                    <Badge variant={r.role === "admin" ? "default" : "secondary"}>{roleLabels[r.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "active" ? "outline" : "destructive"}>
                      {r.status === "active" ? "Activo" : "Desactivado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(["admin", "manager", "médico", "auxiliar", "empleado", "recepción"] as EmployeeRole[]).filter((next) => next !== r.role).map((next) => (
                          <DropdownMenuItem
                            key={next}
                            disabled={isSelf || (isLastAdmin && next !== "admin")}
                            onClick={async () => {
                              const { error } = await setEmployeeRole(r.id, next);
                              if (error) toast.error(error); else { toast.success("Rol actualizado"); reload(); }
                            }}
                          >
                            Cambiar a {roleLabels[next]}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          disabled={isSelf || (r.status === "active" && isLastAdmin)}
                          onClick={async () => {
                            const next = r.status === "active" ? "disabled" : "active";
                            const { error } = await setEmployeeStatus(r.id, next);
                            if (error) toast.error(error); else { toast.success("Estado actualizado"); reload(); }
                          }}
                        >
                          {r.status === "active" ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPwReset(r)}>
                          Resetear contraseña
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!pwReset} onOpenChange={(o) => !o && setPwReset(null)}>
        {pwReset && <ResetPasswordDialog row={pwReset} onClose={() => setPwReset(null)} />}
      </Dialog>
    </div>
  );
}

function CreateEmployeeDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "empleado" as EmployeeRole,
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await createEmployee(form);
    setSubmitting(false);
    if (error) toast.error(error);
    else {
      toast.success("Empleado creado");
      onCreated();
      onClose();
    }
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo empleado</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label>No. de empleado (ej. EO1303)</Label>
          <Input
            value={form.employee_number}
            onChange={(e) => setForm({ ...form, employee_number: e.target.value.toUpperCase() })}
            maxLength={6}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Apellido</Label>
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Contraseña inicial</Label>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as EmployeeRole })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="médico">Médico Veterinario</SelectItem>
              <SelectItem value="auxiliar">Auxiliar Veterinario</SelectItem>
              <SelectItem value="recepción">Recepción</SelectItem>
              <SelectItem value="empleado">Empleado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Creando…" : "Crear"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ResetPasswordDialog({ row, onClose }: { row: EmployeeRow; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Resetear contraseña · {row.employee_number}</DialogTitle></DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const { error } = await resetEmployeePassword(row.id, pw);
          setSubmitting(false);
          if (error) toast.error(error);
          else { toast.success("Contraseña actualizada"); onClose(); }
        }}
        className="space-y-3"
      >
        <div className="space-y-2">
          <Label>Nueva contraseña</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
