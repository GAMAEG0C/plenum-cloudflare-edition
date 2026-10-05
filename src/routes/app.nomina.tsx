import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, subDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Banknote, Users, Receipt, Calendar, FileText, CheckCircle2, Calculator, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { usePayrollReceipts } from "@/hooks/useHRData";
import { useCreatePayrollReceipt } from "@/hooks/useHRMutations";
import { listEmployees } from "@/lib/employees-api";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/app/nomina")({
  component: NominaPage,
});

function NominaPage() {
  const currentMonthStart = startOfMonth(new Date()).toISOString();
  
  const { data: receipts = [], isLoading: loadingReceipts } = usePayrollReceipts();
  
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: listEmployees,
  });

  const createPayroll = useCreatePayrollReceipt();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [payrollForm, setPayrollForm] = useState({
    period_start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    period_end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    base_salary_amount: 0,
    commissions_amount: 0, // In a full implementation, this would fetch from the commissions API
    deductions_amount: 0,
    bonuses_amount: 0,
    notes: "",
  });

  const openGenerator = (emp: any) => {
    setSelectedEmployee(emp);
    setPayrollForm(prev => ({
      ...prev,
      base_salary_amount: Number(emp.base_salary) || 0,
    }));
    setDialogOpen(true);
  };

  const netPay = 
    Number(payrollForm.base_salary_amount) + 
    Number(payrollForm.commissions_amount) + 
    Number(payrollForm.bonuses_amount) - 
    Number(payrollForm.deductions_amount);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    await createPayroll.mutateAsync({
      employee_id: selectedEmployee.id,
      period_start: payrollForm.period_start,
      period_end: payrollForm.period_end,
      base_salary_amount: Number(payrollForm.base_salary_amount),
      commissions_amount: Number(payrollForm.commissions_amount),
      deductions_amount: Number(payrollForm.deductions_amount),
      bonuses_amount: Number(payrollForm.bonuses_amount),
      net_pay: netPay,
      status: "draft",
      notes: payrollForm.notes,
    });
    setDialogOpen(false);
  };

  const totalPayroll = receipts.reduce((sum, r) => sum + Number(r.net_pay), 0);
  const draftReceipts = receipts.filter(r => r.status === "draft");

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Nómina</h1>
        <p className="text-muted-foreground">Genera y administra los pagos y recibos de tus empleados.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Total (Histórico)</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalPayroll.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total pagado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{draftReceipts.length}</div>
            <p className="text-xs text-muted-foreground">Recibos por autorizar/pagar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plantilla Activa</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{employees.filter(e => e.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">Empleados listos para nómina</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generator" className="flex-1">
        <TabsList>
          <TabsTrigger value="generator">Generador de Recibos</TabsTrigger>
          <TabsTrigger value="history">Historial de Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Empleados</CardTitle>
              <CardDescription>Selecciona un empleado para calcular y generar su recibo de nómina del periodo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Sueldo Base</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.employee_number}</TableCell>
                      <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                      <TableCell className="capitalize">{emp.role}</TableCell>
                      <TableCell className="text-right">${Number(emp.base_salary || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="sm" onClick={() => openGenerator(emp)}>
                          <Calculator className="mr-2 h-4 w-4" /> Calcular
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recibos Generados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total a Pagar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No hay recibos generados todavía.
                      </TableCell>
                    </TableRow>
                  ) : (
                    receipts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {format(new Date(r.period_start), "dd/MM")} - {format(new Date(r.period_end), "dd/MM/yy")}
                        </TableCell>
                        <TableCell>{r.employee?.first_name} {r.employee?.last_name}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "paid" ? "default" : "secondary"}>
                            {r.status === "paid" ? "Pagado" : "Borrador"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${Number(r.net_pay).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* GENERATOR DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calcular Nómina</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-lg">{selectedEmployee.first_name} {selectedEmployee.last_name}</span>
                <Badge variant="outline">{selectedEmployee.role}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inicio del Periodo</Label>
                  <Input type="date" required value={payrollForm.period_start} onChange={e => setPayrollForm({...payrollForm, period_start: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Fin del Periodo</Label>
                  <Input type="date" required value={payrollForm.period_end} onChange={e => setPayrollForm({...payrollForm, period_end: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sueldo Base ($)</Label>
                <Input type="number" step="0.01" value={payrollForm.base_salary_amount} onChange={e => setPayrollForm({...payrollForm, base_salary_amount: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Comisiones Extra ($)</Label>
                <Input type="number" step="0.01" value={payrollForm.commissions_amount} onChange={e => setPayrollForm({...payrollForm, commissions_amount: Number(e.target.value)})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-red-500">Descuentos / Faltas ($)</Label>
                  <Input type="number" step="0.01" value={payrollForm.deductions_amount} onChange={e => setPayrollForm({...payrollForm, deductions_amount: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-500">Bonos ($)</Label>
                  <Input type="number" step="0.01" value={payrollForm.bonuses_amount} onChange={e => setPayrollForm({...payrollForm, bonuses_amount: Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input placeholder="Ej. Bono por puntualidad" value={payrollForm.notes} onChange={e => setPayrollForm({...payrollForm, notes: e.target.value})} />
              </div>

              <div className="bg-muted p-3 rounded-md flex justify-between items-center text-lg mt-4">
                <span className="font-semibold">Total a Pagar:</span>
                <span className="font-bold text-green-600">${netPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>

              <Button type="submit" className="w-full" disabled={createPayroll.isPending}>
                {createPayroll.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Borrador de Recibo"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
