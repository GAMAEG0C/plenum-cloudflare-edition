import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useCommissions, useGuardias } from "@/hooks/useClinicData";
import { useAttendance } from "@/hooks/useHRData";
import { useCreateGuardia, useUpdateCommissionStatus } from "@/hooks/useClinicMutations";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { listEmployees } from "@/lib/employees-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Plus, ShieldCheck, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import type { Commission, Guardia } from "@/hooks/useClinicData";

export const Route = createFileRoute("/app/comisiones")({
  component: ComisionesPage,
  head: () => ({ meta: [{ title: "Comisiones — UniversumK9 Stack" }] }),
});

function useEmployees() {
  return useQuery({ queryKey: ["employees-list"], queryFn: () => listEmployees() });
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  paid: "Pagada",
  rejected: "Denegada",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  approved: "outline",
  paid: "default",
  rejected: "destructive",
};

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function ComisionesPage() {
  const { can } = usePermissions();
  const [period, setPeriod] = useState(currentPeriod());

  const { data: commissions = [], isLoading: loadingComm } = useCommissions(period);
  const { data: guardias = [], isLoading: loadingGuard } = useGuardias(period);
  const { data: attendance = [], isLoading: loadingAttendance } = useAttendance();
  const { data: employees = [] } = useEmployees();
  const { mutate: updateStatus } = useUpdateCommissionStatus();
  const { mutate: createGuardia, isLoading: creatingGuard } = useCreateGuardia();

  const [guardiaOpen, setGuardiaOpen] = useState(false);
  const [gForm, setGForm] = useState({ employee_id: "", date: "", type: "entre_semana" as const, notes: "" });

  // Agrupar comisiones por empleado
  const byEmployee = useMemo(() => {
    const map = new Map<string, { emp: any; commissions: Commission[]; total: number }>();
    for (const c of commissions) {
      const key = c.employee_id;
      if (!map.has(key)) map.set(key, { emp: c.employee, commissions: [], total: 0 });
      const entry = map.get(key)!;
      entry.commissions.push(c);
      entry.total += c.amount ?? 0;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [commissions]);

  // Guardias agrupadas por empleado
  const guardiaByEmp = useMemo(() => {
    const map = new Map<string, { emp: any; guardias: Guardia[]; total: number }>();
    for (const g of guardias) {
      const key = g.employee_id;
      if (!map.has(key)) map.set(key, { emp: g.employee, guardias: [], total: 0 });
      const entry = map.get(key)!;
      entry.guardias.push(g);
      entry.total += g.amount;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [guardias]);

  const totalComisiones = commissions.reduce((s, c) => s + (c.amount ?? 0), 0);
  const totalGuardias = guardias.reduce((s, g) => s + g.amount, 0);

  const handleStatusChange = (id: string, status: "pending" | "approved" | "paid") => {
    updateStatus(id, status, {
      onSuccess: () => toast.success("Estado actualizado."),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleSaveGuardia = () => {
    if (!gForm.employee_id) return toast.error("Selecciona un empleado.");
    if (!gForm.date) return toast.error("Selecciona la fecha de la guardia.");
    createGuardia(
      { ...gForm },
      {
        onSuccess: () => { toast.success("Guardia registrada."); setGuardiaOpen(false); setGForm({ employee_id: "", date: "", type: "entre_semana", notes: "" }); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const periodLabel = (() => {
    const [y, m] = period.split("-");
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  })();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Comisiones y Guardias
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            Período: {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="period-selector"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-44"
          />
          {can("log_guardia") && (
            <Dialog open={guardiaOpen} onOpenChange={setGuardiaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" id="btn-nueva-guardia">
                  <Plus className="h-4 w-4" /> Registrar Guardia
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px]">
                <DialogHeader><DialogTitle>Registrar Guardia</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Empleado</Label>
                    <Select value={gForm.employee_id} onValueChange={(v) => setGForm({ ...gForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.employee_number} — {e.first_name} {e.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha de la guardia</Label>
                    <Input type="date" value={gForm.date} onChange={(e) => setGForm({ ...gForm, date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de guardia</Label>
                    <Select value={gForm.type} onValueChange={(v: any) => setGForm({ ...gForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entre_semana">Entre semana — $450</SelectItem>
                        <SelectItem value="fin_de_semana">Fin de semana — $500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notas (opcional)</Label>
                    <Input placeholder="Observaciones..." value={gForm.notes} onChange={(e) => setGForm({ ...gForm, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGuardiaOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveGuardia} disabled={creatingGuard}>{creatingGuard ? "Guardando..." : "Registrar"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2"><TrendingUp className="h-4 w-4 text-primary" /></div>
            <span className="text-sm font-medium text-muted-foreground">Comisiones del período</span>
          </div>
          <p className="text-2xl font-bold">${totalComisiones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{commissions.length} consultas registradas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-amber-500/10 p-2"><Clock className="h-4 w-4 text-amber-500" /></div>
            <span className="text-sm font-medium text-muted-foreground">Guardias del período</span>
          </div>
          <p className="text-2xl font-bold">${totalGuardias.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{guardias.length} guardias registradas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-green-500/10 p-2"><DollarSign className="h-4 w-4 text-green-500" /></div>
            <span className="text-sm font-medium text-muted-foreground">Total a pagar</span>
          </div>
          <p className="text-2xl font-bold">${(totalComisiones + totalGuardias).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-1">Comisiones + guardias</p>
        </div>
      </div>

      <Tabs defaultValue="comisiones">
        <TabsList>
          <TabsTrigger value="comisiones" id="tab-comisiones">Comisiones por consulta</TabsTrigger>
          <TabsTrigger value="guardias" id="tab-guardias">Guardias</TabsTrigger>
          <TabsTrigger value="nomina" id="tab-nomina">Asistencia & Nómina</TabsTrigger>
        </TabsList>

        {/* Comisiones Tab */}
        <TabsContent value="comisiones" className="mt-4 space-y-4">
          {loadingComm ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Cargando comisiones...</div>
          ) : byEmployee.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No hay comisiones registradas para este período.</p>
              <p className="text-xs text-muted-foreground mt-1">Las comisiones se generan automáticamente al registrar una consulta.</p>
            </div>
          ) : (
            byEmployee.map(({ emp, commissions: empComms, total }) => (
              <div key={emp?.id ?? "unknown"} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
                  <div>
                    <p className="font-semibold">{emp ? `${emp.first_name} ${emp.last_name}` : "Empleado desconocido"}</p>
                    <p className="text-xs text-muted-foreground">{emp?.employee_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">{empComms.length} comisión(es)</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Procedimiento</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      {can("view_commissions") && <TableHead>Acción</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empComms.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("es-MX")}
                        </TableCell>
                        <TableCell className="text-sm">{c.procedure?.name ?? "—"}</TableCell>
                        <TableCell className="font-semibold">
                          ${(c.amount ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                        </TableCell>
                        {can("view_commissions") && (
                          <TableCell>
                            <Select value={c.status} onValueChange={(v: any) => handleStatusChange(c.id, v)}>
                              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="approved">Aprobada</SelectItem>
                                <SelectItem value="paid">Pagada</SelectItem>
                                <SelectItem value="rejected">Denegada</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </TabsContent>

        {/* Guardias Tab */}
        <TabsContent value="guardias" className="mt-4 space-y-4">
          {loadingGuard ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Cargando guardias...</div>
          ) : guardias.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No hay guardias registradas para este período.</p>
            </div>
          ) : (
            <>
              {guardiaByEmp.map(({ emp, guardias: empGuards, total }) => (
                <div key={emp?.id ?? "unknown"} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
                    <div>
                      <p className="font-semibold">{emp ? `${emp.first_name} ${emp.last_name}` : "Empleado desconocido"}</p>
                      <p className="text-xs text-muted-foreground">{emp?.employee_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">{empGuards.length} guardia(s)</p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empGuards.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="text-sm">{new Date(g.date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" })}</TableCell>
                          <TableCell>
                            <Badge variant={g.type === "fin_de_semana" ? "default" : "outline"} className="text-xs">
                              <CalendarDays className="h-3 w-3 mr-1" />
                              {g.type === "fin_de_semana" ? "Fin de semana" : "Entre semana"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">${g.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{g.notes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </>
          )}
        </TabsContent>

        {/* Asistencia & Nomina Tab */}
        <TabsContent value="nomina" className="mt-4 space-y-4">
          {loadingAttendance ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Cargando datos de asistencia...</div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">No hay empleados registrados.</div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-center">Días Laborados</TableHead>
                    <TableHead className="text-center">Horas Registradas</TableHead>
                    <TableHead className="text-right">Total Comisiones</TableHead>
                    <TableHead className="text-right">Total Guardias</TableHead>
                    <TableHead className="text-right font-bold">Total a Pagar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const empAtt = attendance.filter((a) => {
                      if (a.employee_id !== emp.id) return false;
                      const date = new Date(a.clock_in);
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      return `${y}-${m}` === period;
                    });

                    const uniqueDays = new Set(
                      empAtt.map((a) => new Date(a.clock_in).toDateString())
                    ).size;

                    const totalHours = empAtt.reduce((sum, a) => {
                      if (!a.clock_out) return sum;
                      const diff = new Date(a.clock_out).getTime() - new Date(a.clock_in).getTime();
                      return sum + diff / (1000 * 60 * 60);
                    }, 0);

                    const empCommTotal = byEmployee.find((x) => x.emp?.id === emp.id)?.total || 0;
                    const empGuardTotal = guardiaByEmp.find((x) => x.emp?.id === emp.id)?.total || 0;

                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <p className="font-semibold text-xs text-foreground">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {emp.employee_number} | {emp.role}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold">
                          {uniqueDays} d.
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {totalHours.toFixed(1)} hrs.
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-green-700">
                          ${empCommTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-amber-700">
                          ${empGuardTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-primary">
                          ${(empCommTotal + empGuardTotal).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
