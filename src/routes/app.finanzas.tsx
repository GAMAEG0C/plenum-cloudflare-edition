import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, TrendingDown, TrendingUp, Receipt, Building2, CreditCard, Plus, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { useExpenses, useCreateExpense, useUpdatePurchaseOrderPayment } from "@/hooks/useFinanceData";
import { usePurchaseOrders } from "@/hooks/useInventoryData";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/finanzas")({
  component: FinanzasPage,
});

const EXPENSE_CATEGORIES = [
  "Renta",
  "Servicios (Luz, Agua, Internet)",
  "Nómina (Fija)",
  "Insumos de Limpieza",
  "Marketing y Publicidad",
  "Mantenimiento",
  "Impuestos",
  "Otros",
];

function FinanzasPage() {
  const { user } = useAuth();
  
  // For simplicity, we just fetch all recent data (in a real app, we would filter by date range picker)
  const currentMonthStart = startOfMonth(new Date()).toISOString();
  
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses(currentMonthStart);
  const { data: pos = [], isLoading: loadingPOs } = usePurchaseOrders();
  
  const createExpense = useCreateExpense();
  const updatePOPayment = useUpdatePurchaseOrderPayment();

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "",
    description: "",
    payment_method: "Transferencia",
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await createExpense.mutateAsync({
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category,
      description: expenseForm.description,
      payment_method: expenseForm.payment_method,
      recorded_by: user.id,
    });
    setExpenseDialogOpen(false);
    setExpenseForm({ amount: "", category: "", description: "", payment_method: "Transferencia" });
  };

  const handlePayPO = async (poId: string, totalCost: number) => {
    // In a real app, we would open a dialog to specify the amount paid. For now, mark as fully paid.
    await updatePOPayment.mutateAsync({
      id: poId,
      payment_status: "paid",
      amount_paid: totalCost,
    });
  };

  // Calculate Dashboard Metrics
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  
  // Calculate Accounts Payable (Only POs that are received/partial but not fully paid)
  const pendingPOs = pos.filter((po) => po.paymentStatus !== "paid");
  const totalAccountsPayable = pendingPOs.reduce((sum, po) => sum + (Number(po.totalCost) - Number(po.amountPaid)), 0);
  
  // For a real P&L, we would also fetch POS Sales here. We'll leave a placeholder for Revenues.
  const estimatedRevenue = 150000; // Placeholder for demo
  const netProfit = estimatedRevenue - totalExpenses; // Just subtracting OPEX for demo

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Finanzas y Contabilidad</h1>
        <p className="text-muted-foreground">
          ERP: Estado de resultados, cuentas por pagar y gastos operativos.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 lg:w-[600px]">
          <TabsTrigger value="dashboard">Dashboard (P&L)</TabsTrigger>
          <TabsTrigger value="cxp">Cuentas por Pagar</TabsTrigger>
          <TabsTrigger value="opex">Gastos Operativos</TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Brutos (Mes)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${estimatedRevenue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Desde el Punto de Venta</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Operativos (OPEX)</CardTitle>
                <Receipt className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ${totalExpenses.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Renta, luz, nómina, etc.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deuda Proveedores (CxP)</CardTitle>
                <Building2 className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${totalAccountsPayable.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Pendiente de liquidar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilidad Neta (Estimada)</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${netProfit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Ingresos - Gastos</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACCOUNTS PAYABLE TAB */}
        <TabsContent value="cxp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas por Pagar (Proveedores)</CardTitle>
              <CardDescription>Facturas y órdenes de compra pendientes de liquidar.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Estado Pago</TableHead>
                    <TableHead className="text-right">Total a Pagar</TableHead>
                    <TableHead className="text-right">Deuda Restante</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPOs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay deudas con proveedores.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingPOs.map((po) => {
                      const remaining = po.totalCost - po.amountPaid;
                      return (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">{po.orderNumber}</TableCell>
                          <TableCell>{po.expectedDelivery ? format(new Date(po.expectedDelivery), "dd/MM/yyyy") : "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={po.paymentStatus === "partial" ? "outline" : "destructive"}>
                              {po.paymentStatus === "partial" ? "Parcial" : "Sin Pagar"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">${po.totalCost.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">${remaining.toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePayPO(po.id, po.totalCost)}
                              disabled={updatePOPayment.isPending}
                            >
                              Liquidar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="opex" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Registro de Gastos (Caja Chica / OPEX)</h2>
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Registrar Gasto</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateExpense} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={expenseForm.category} onValueChange={(val) => setExpenseForm({...expenseForm, category: val})}>
                      <SelectTrigger><SelectValue placeholder="Selecciona una categoría..." /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monto ($)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Pago</Label>
                    <Select value={expenseForm.payment_method} onValueChange={(val) => setExpenseForm({...expenseForm, payment_method: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo (Caja Chica)">Efectivo (Caja Chica)</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción / Concepto</Label>
                    <Input 
                      required 
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                      placeholder="Ej. Pago de CFE Octubre"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createExpense.isPending}>
                    {createExpense.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Gasto"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Registró</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay gastos registrados en este periodo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{format(new Date(exp.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell><Badge variant="secondary">{exp.category}</Badge></TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell>{exp.payment_method}</TableCell>
                        <TableCell>{exp.employee?.first_name} {exp.employee?.last_name}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          ${Number(exp.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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
    </div>
  );
}
