import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  User,
  Truck,
  DollarSign,
  Calendar,
  FileText,
  Search,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCustomerCredits, useSupplierCredits, useActiveCashSession } from "@/hooks/usePOSData";
import { usePayCustomerCredit, usePaySupplierCredit } from "@/hooks/usePOSMutations";

export const Route = createFileRoute("/app/cuentas")({
  component: CuentasPage,
  head: () => ({ meta: [{ title: "Cuentas por Cobrar/Pagar — UniversumK9 Stack" }] }),
});

function CuentasPage() {
  const { data: customerCredits = [], isLoading: loadingCustomers } = useCustomerCredits();
  const { data: supplierCredits = [], isLoading: loadingSuppliers } = useSupplierCredits();
  const { data: activeSession } = useActiveCashSession();

  const payCustomerCredit = usePayCustomerCredit();
  const paySupplierCredit = usePaySupplierCredit();

  // Search filter states
  const [customerSearch, setCustomerSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");

  // Dialog states
  const [selectedCredit, setSelectedCredit] = useState<any | null>(null);
  const [creditType, setCreditType] = useState<"customer" | "supplier">("customer");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Filter Customer Credits
  const filteredCustomerCredits = useMemo(() => {
    return customerCredits.filter((c) => {
      const pName = (c.patients?.name || "").toLowerCase();
      const oName = (c.patients?.owner_name || "").toLowerCase();
      const ticket = (c.sales?.ticket_number || "").toLowerCase();
      const search = customerSearch.toLowerCase();
      return pName.includes(search) || oName.includes(search) || ticket.includes(search);
    });
  }, [customerCredits, customerSearch]);

  // Filter Supplier Credits
  const filteredSupplierCredits = useMemo(() => {
    return supplierCredits.filter((c) => {
      const sName = (c.suppliers?.name || "").toLowerCase();
      const poNum = (c.purchase_orders?.order_number || "").toLowerCase();
      const search = supplierSearch.toLowerCase();
      return sName.includes(search) || poNum.includes(search);
    });
  }, [supplierCredits, supplierSearch]);

  // Financial Summaries
  const totalReceivable = useMemo(() => {
    return customerCredits
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + Number(c.remaining_balance), 0);
  }, [customerCredits]);

  const totalPayable = useMemo(() => {
    return supplierCredits
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + Number(c.remaining_balance), 0);
  }, [supplierCredits]);

  // Open Payment Dialog
  const openPaymentDialog = (credit: any, type: "customer" | "supplier") => {
    setSelectedCredit(credit);
    setCreditType(type);
    setPaymentAmount(credit.remaining_balance.toString());
    setPaymentDialogOpen(true);
  };

  // Submit Payment/Deposit
  const handlePaymentSubmit = () => {
    if (!selectedCredit) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      return toast.error("El monto ingresado debe ser positivo.");
    }
    if (amount > selectedCredit.remaining_balance) {
      return toast.error("El abono no puede exceder el saldo restante.");
    }

    const payMutate = creditType === "customer" ? payCustomerCredit : paySupplierCredit;

    payMutate.mutate(
      {
        creditId: selectedCredit.id,
        amountPaid: amount,
        sessionId: activeSession?.id || null, // Link to cash register if open
      },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false);
          setPaymentAmount("");
          setSelectedCredit(null);
          toast.success("Pago / Abono registrado correctamente.");
          if (activeSession && creditType === "customer") {
            toast.info(`Efectivo registrado en caja: +$${amount}`);
          } else if (activeSession && creditType === "supplier") {
            toast.info(`Retiro de efectivo registrado en caja: -$${amount}`);
          }
        },
        onError: (e: any) => toast.error(`Error: ${e.message}`),
      }
    );
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          💰 Control de Cuentas (Créditos)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra deudas por cobrar de clientes y deudas por pagar a proveedores.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-border bg-card shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cuentas por Cobrar (Clientes)</p>
            <p className="text-2xl font-bold text-green-700 font-mono">${totalReceivable.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-700 rounded-2xl border border-green-100">
            <TrendingUp className="h-6 w-6" />
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cuentas por Pagar (Proveedores)</p>
            <p className="text-2xl font-bold text-red-700 font-mono">${totalPayable.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-700 rounded-2xl border border-red-100">
            <TrendingDown className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* RLS Caja warning */}
      {!activeSession && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <AlertCircle className="h-4 w-4 shrink-0 animate-bounce" />
          <span>
            <strong>Atención:</strong> No hay un turno de caja abierto. Los abonos y cobros se aplicarán a las deudas pero no ingresarán/retirarán flujo de la caja hasta que abras una sesión de caja en el Punto de Venta.
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="receivable" className="space-y-4">
        <TabsList className="w-full max-w-[400px]">
          <TabsTrigger value="receivable" className="flex-1 font-bold">Por Cobrar (Clientes)</TabsTrigger>
          <TabsTrigger value="payable" className="flex-1 font-bold">Por Pagar (Proveedores)</TabsTrigger>
        </TabsList>

        {/* Tab 1: Cuentas por Cobrar */}
        <TabsContent value="receivable" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Buscar por mascota, tutor o ticket de venta..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9 text-xs rounded-xl"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {loadingCustomers ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Cargando cuentas por cobrar...</div>
            ) : filteredCustomerCredits.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No hay cuentas pendientes por cobrar que coincidan.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paciente (Tutor)</TableHead>
                    <TableHead>Ticket original</TableHead>
                    <TableHead className="text-right">Monto Crédito</TableHead>
                    <TableHead className="text-right">Saldo Restante</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomerCredits.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-xs text-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" /> 🐕 {c.patients?.name || "General"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{c.patients?.owner_name || "—"}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {c.sales?.ticket_number || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        ${Number(c.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-red-600">
                        ${Number(c.remaining_balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.status === "paid" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] font-bold rounded-lg py-0.5 px-2">Liquidado</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold rounded-lg py-0.5 px-2">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        {c.status !== "paid" && (
                          <Button size="sm" className="h-8 text-[10px] rounded-lg font-bold" onClick={() => openPaymentDialog(c, "customer")}>
                            Abonar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Cuentas por Pagar */}
        <TabsContent value="payable" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Buscar por proveedor o número de orden de compra..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              className="pl-9 text-xs rounded-xl"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {loadingSuppliers ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Cargando cuentas por pagar...</div>
            ) : filteredSupplierCredits.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No hay cuentas pendientes por pagar que coincidan.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Orden Compra</TableHead>
                    <TableHead className="text-right">Monto Original</TableHead>
                    <TableHead className="text-right">Saldo Restante</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupplierCredits.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-xs text-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" /> {c.suppliers?.name || "Desconocido"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{c.suppliers?.contact_name || "—"}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {c.purchase_orders?.order_number || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        ${Number(c.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-red-600">
                        ${Number(c.remaining_balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.status === "paid" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] font-bold rounded-lg py-0.5 px-2">Liquidado</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold rounded-lg py-0.5 px-2">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        {c.status !== "paid" && (
                          <Button size="sm" className="h-8 text-[10px] rounded-lg font-bold" onClick={() => openPaymentDialog(c, "supplier")}>
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Registrar Pago / Abono */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {creditType === "customer" ? "Registrar Abono de Cliente" : "Registrar Pago a Proveedor"}
            </DialogTitle>
          </DialogHeader>

          {selectedCredit && (
            <div className="space-y-4 py-3">
              <div className="bg-muted/40 border p-3 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Deudor:</span>
                  <span>
                    {creditType === "customer"
                      ? `${selectedCredit.patients?.owner_name} (Mascota: ${selectedCredit.patients?.name})`
                      : selectedCredit.suppliers?.name}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Saldo Actual:</span>
                  <span className="font-bold text-red-600">${Number(selectedCredit.remaining_balance).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Monto a Registrar ($)</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  max={selectedCredit.remaining_balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="font-mono text-center text-lg font-bold h-11 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  Ingresa el monto del abono. Si liquidas la totalidad, la cuenta se marcará como liquidada.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPaymentDialogOpen(false)} className="rounded-xl flex-1">
              Cancelar
            </Button>
            <Button onClick={handlePaymentSubmit} disabled={payCustomerCredit.isLoading || paySupplierCredit.isLoading} className="rounded-xl flex-1 font-bold">
              {payCustomerCredit.isLoading || paySupplierCredit.isLoading ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
