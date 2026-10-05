import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  Barcode,
  ArrowRight,
  TrendingDown,
  X,
  PlusCircle,
  MinusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useItems } from "@/hooks/useInventoryData";
import { useConsultations, usePatients, useProcedures } from "@/hooks/useClinicData";
import {
  useActiveCashSession,
  useCashMovements,
  useSales
} from "@/hooks/usePOSData";
import {
  useCreateSale,
  useOpenCashSession,
  useCloseCashSession,
  useRecordCashMovement
} from "@/hooks/usePOSMutations";

export const Route = createFileRoute("/app/ventas")({
  component: POSPage,
  head: () => ({ meta: [{ title: "Punto de Venta (POS) — UniversumK9 Stack" }] }),
});

interface CartItem {
  itemId: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  quantity: number;
  stock: number;
  isProcedure?: boolean;
  procedureId?: string;
}

function POSPage() {
  const { data: allItems = [] } = useItems();
  const { data: patients = [] } = usePatients();
  const { data: procedures = [] } = useProcedures();
  const { data: consultations = [] } = useConsultations();
  const { data: activeSession, isLoading: loadingSession } = useActiveCashSession();

  const createSale = useCreateSale();
  const openSession = useOpenCashSession();
  const closeSession = useCloseCashSession();
  const recordCashMovement = useRecordCashMovement();

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("Público General");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [barcodeQuery, setBarcodeQuery] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [linkedConsultationId, setLinkedConsultationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "procedures">("products");

  // Dialog States
  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [closeSessionOpen, setCloseSessionOpen] = useState(false);
  const [cashMovementOpen, setCashMovementOpen] = useState(false);
  const [prescriptionPanelOpen, setPrescriptionPanelOpen] = useState(false);

  // Cash Movement State
  const [cashMovementType, setCashMovementType] = useState<"inflow" | "outflow">("inflow");
  const [cashMovementAmount, setCashMovementAmount] = useState("");
  const [cashMovementReason, setCashMovementReason] = useState("");

  // Apertura State
  const [initialCashInput, setInitialCashInput] = useState("");

  // Corte State
  const [actualCashInput, setActualCashInput] = useState("");
  const [corteNotes, setCorteNotes] = useState("");

  // Auto-fill customerName when patient changes
  useEffect(() => {
    if (selectedPatientId && selectedPatientId !== "general") {
      const patient = patients.find((p) => p.id === selectedPatientId);
      if (patient) {
        setCustomerName(patient.owner_name || `Propietario de ${patient.name}`);
      }
    } else {
      setCustomerName("Público General");
    }
  }, [selectedPatientId, patients]);

  // Open dialog if session is missing
  useEffect(() => {
    if (!loadingSession && !activeSession) {
      setOpenSessionOpen(true);
    }
  }, [activeSession, loadingSession]);

  // Barcode / SKU scan event
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeQuery.trim()) return;

    const query = barcodeQuery.trim().toLowerCase();
    const item = allItems.find(
      (it) => (it.barcode && it.barcode.toLowerCase() === query) || it.sku.toLowerCase() === query
    );

    if (item) {
      addToCart(item);
      setBarcodeQuery("");
      toast.success(`Escaneado: ${item.name}`);
    } else {
      toast.error(`No se encontró producto con SKU o código: "${barcodeQuery}"`);
    }
  };

  // Add Item to Cart
  const addToCart = (item: any, isProcedure = false, procedureId?: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === item.id);
      if (existing) {
        if (!isProcedure && existing.quantity >= item.currentStock) {
          toast.warning("Stock insuficiente para agregar más.");
          return prev;
        }
        return prev.map((i) =>
          i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          sku: item.sku || (isProcedure ? `PROC-${item.name.substring(0, 4).toUpperCase().replace(/\s/g, "")}` : ""),
          unit: item.unit || "pz",
          price: isProcedure ? item.base_price : item.sellingPrice,
          quantity: 1,
          stock: isProcedure ? 9999 : item.currentStock,
          isProcedure,
          procedureId,
        },
      ];
    });
  };

  // Remove Item from Cart
  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  // Update Cart Quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.itemId === itemId) {
            const nextQty = i.quantity + delta;
            if (nextQty <= 0) return null;
            if (!i.isProcedure && nextQty > i.stock) {
              toast.warning("Stock insuficiente en inventario.");
              return i;
            }
            return { ...i, quantity: nextQty };
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Filtered products list for sidebar search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const q = searchQuery.toLowerCase();
    return allItems.filter(
      (it) => 
        it.name.toLowerCase().includes(q) || 
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.barcode && it.barcode.toLowerCase().includes(q))
    );
  }, [allItems, searchQuery]);

  // Filtered procedures list for sidebar search
  const filteredProcedures = useMemo(() => {
    if (!searchQuery.trim()) return procedures;
    const q = searchQuery.toLowerCase();
    return procedures.filter(
      (p) => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [procedures, searchQuery]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === "percentage") {
      return (subtotal * discount) / 100;
    }
    return discount;
  }, [subtotal, discount, discountType]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const changeDue = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, paid - total);
  }, [amountPaid, total]);

  // Cargar receta desde consulta seleccionada
  const handleLoadPrescription = (consult: any) => {
    // 1. Limpiar carrito previo
    const newCart: CartItem[] = [];

    // 2. Cargar procedimiento de la consulta
    if (consult.procedure) {
      newCart.push({
        itemId: consult.procedure.id,
        name: `Consulta: ${consult.procedure.name}`,
        sku: "PROC-" + consult.procedure.name.substring(0, 4).toUpperCase(),
        unit: "serv",
        price: consult.procedure.base_price,
        quantity: 1,
        stock: 9999,
        isProcedure: true,
        procedureId: consult.procedure.id,
      });
    }

    // 3. Cargar medicamentos de la receta
    if (consult.prescriptions && consult.prescriptions.length > 0) {
      consult.prescriptions.forEach((rx: any) => {
        if (rx.item) {
          newCart.push({
            itemId: rx.item.id,
            name: rx.item.name,
            sku: rx.item.sku,
            unit: rx.item.unit || "pz",
            price: rx.item.selling_price || rx.item.sellingPrice || 0,
            quantity: rx.quantity || 1,
            stock: rx.item.current_stock || rx.item.currentStock || 0,
          });
        }
      });
    }

    setCart(newCart);
    setSelectedPatientId(consult.patient_id);
    setLinkedConsultationId(consult.id);
    setPrescriptionPanelOpen(false);
    toast.success("Receta médica cargada al ticket exitosamente.");
  };

  // Submit checkout
  const handleCheckout = () => {
    if (cart.length === 0) return toast.error("El carrito está vacío.");
    if (!activeSession) return toast.error("No hay una sesión de caja abierta.");

    if (paymentMethod === "credit" && (!selectedPatientId || selectedPatientId === "general")) {
      return toast.error("Para ventas a crédito debes seleccionar un paciente/dueño registrado.");
    }

    if (paymentMethod === "cash" && (parseFloat(amountPaid) || 0) < total) {
      return toast.error("El monto pagado es menor al total de la venta.");
    }

    const ticketNumber = `TICK-${Date.now()}`;

    createSale.mutate(
      {
        ticketNumber,
        patientId: selectedPatientId === "general" ? null : selectedPatientId,
        consultationId: linkedConsultationId,
        customerName,
        paymentMethod,
        subtotal,
        discount: discountAmount,
        total,
        amountPaid: paymentMethod === "cash" ? parseFloat(amountPaid) || total : total,
        changeReturned: paymentMethod === "cash" ? changeDue : 0,
        sessionId: activeSession.id,
        items: cart.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice: i.price,
          isProcedure: i.isProcedure || false,
          procedureId: i.procedureId || null,
        })),
      },
      {
        onSuccess: () => {
          toast.success(`Venta completada. Ticket: ${ticketNumber}`);
          setCart([]);
          setAmountPaid("");
          setDiscount(0);
          setLinkedConsultationId(null);
          setSelectedPatientId("");
        },
        onError: (e: any) => toast.error(`Error en cobro: ${e.message}`),
      }
    );
  };

  // Open Caja Session
  const handleOpenSession = () => {
    const initCash = parseFloat(initialCashInput);
    if (isNaN(initCash) || initCash < 0) {
      return toast.error("El fondo inicial debe ser mayor o igual a 0.");
    }

    openSession.mutate(initCash, {
      onSuccess: () => {
        setOpenSessionOpen(false);
        setInitialCashInput("");
        toast.success("Caja abierta exitosamente.");
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  // Close Caja Session (Corte)
  const handleCloseSession = () => {
    if (!activeSession) return;
    const actual = parseFloat(actualCashInput);
    if (isNaN(actual) || actual < 0) {
      return toast.error("El conteo de efectivo real debe ser mayor o igual a 0.");
    }

    closeSession.mutate(
      {
        sessionId: activeSession.id,
        actualCash: actual,
        notes: corteNotes,
      },
      {
        onSuccess: () => {
          setCloseSessionOpen(false);
          setActualCashInput("");
          setCorteNotes("");
          toast.success("Caja cerrada y corte registrado con éxito.");
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  // Register Cash inflow/outflow
  const handleCashMovementSubmit = () => {
    if (!activeSession) return;
    const amt = parseFloat(cashMovementAmount);
    if (isNaN(amt) || amt <= 0) return toast.error("El monto debe ser positivo.");
    if (!cashMovementReason.trim()) return toast.error("Debes indicar el motivo.");

    recordCashMovement.mutate(
      {
        sessionId: activeSession.id,
        type: cashMovementType,
        amount: amt,
        reason: cashMovementReason,
      },
      {
        onSuccess: () => {
          setCashMovementOpen(false);
          setCashMovementAmount("");
          setCashMovementReason("");
          toast.success(
            `Registro exitoso: ${cashMovementType === "inflow" ? "Ingreso" : "Retiro"} por $${amt}`
          );
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  // Consultas pendientes de cobro (que no están ligadas a ninguna venta facturada)
  const pendingConsultations = useMemo(() => {
    return consultations.filter((c) => {
      // Filtrar las que tienen receta o procedimiento y no están enlazadas
      // En una DB real tendríamos un flag de billed o buscaríamos en la tabla sales
      return c.patient && c.procedure;
    });
  }, [consultations]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      {/* Columna Izquierda: Escáner y Carrito */}
      <div className="lg:col-span-2 flex flex-col space-y-4 min-h-0">
        <Card className="rounded-2xl border border-border flex flex-col min-h-0 flex-1">
          <CardHeader className="py-4 px-6 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Ticket de Venta
            </CardTitle>
            {activeSession && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Caja Abierta: ${activeSession.expected_cash.toFixed(2)}
                </Badge>
                <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => setCashMovementOpen(true)}>
                  💸 Mov. Caja
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg border-red-200 text-red-700 hover:bg-red-50" onClick={() => setCloseSessionOpen(true)}>
                  🔒 Cerrar Caja
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4 min-h-0 space-y-3">
            {/* Lector Escáner */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Escanea código de barras o escribe SKU y presiona Enter..."
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="rounded-xl text-xs gap-1">
                Agregar
              </Button>
            </form>

            {/* Listado de Productos en Ticket */}
            <div className="flex-1 overflow-y-auto border border-border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Producto / Servicio</TableHead>
                    <TableHead className="text-center w-24">Precio</TableHead>
                    <TableHead className="text-center w-32">Cantidad</TableHead>
                    <TableHead className="text-right w-24">Importe</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell>
                        <p className="font-semibold text-xs text-foreground truncate max-w-[200px]" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.sku} {item.isProcedure && <span className="text-primary font-bold">(Servicio)</span>}
                        </p>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold">
                        ${item.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.itemId, -1)}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <MinusCircle className="h-4.5 w-4.5" />
                          </button>
                          <span className="font-mono text-xs font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.itemId, 1)}
                            disabled={!item.isProcedure && item.quantity >= item.stock}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                          >
                            <PlusCircle className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="p-0 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-red-50 rounded-md"
                          onClick={() => removeFromCart(item.itemId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {cart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center text-xs text-muted-foreground">
                        <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                        El ticket está vacío. Agrega productos buscando a la derecha o escanea códigos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                onClick={() => setPrescriptionPanelOpen(true)}
              >
                <FileText className="h-4 w-4" />
                Cargar Receta Médica de Consulta
              </Button>
              {linkedConsultationId && (
                <Badge variant="secondary" className="gap-1 rounded-lg text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Consulta Vinculada Activa
                  <button onClick={() => setLinkedConsultationId(null)} className="hover:text-red-700 font-bold ml-1 font-mono text-[10px]">×</button>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Columna Central: Catálogo de Productos y Servicios */}
      <div className="lg:col-span-1 flex flex-col space-y-4 min-h-0">
        <Card className="rounded-2xl border border-border flex flex-col min-h-0 flex-1 bg-card">
          <CardHeader className="py-4 px-6 border-b flex flex-col space-y-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Catálogo de Venta
            </CardTitle>
            
            {/* Buscador de Catálogo */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar en catálogo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Pestañas de Catálogo */}
            <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className={`py-1.5 rounded-lg font-medium transition-all text-center ${
                  activeTab === "products"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📦 Productos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("procedures")}
                className={`py-1.5 rounded-lg font-medium transition-all text-center ${
                  activeTab === "procedures"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🩺 Servicios
              </button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
            {activeTab === "products" ? (
              <>
                {filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/20 transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-xs text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]" title={item.sku}>{item.sku}</span>
                        <span className={`text-[10px] font-bold ${item.currentStock > 0 ? "text-green-600" : "text-destructive"}`}>
                          • Stock: {item.currentStock}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">${item.sellingPrice.toFixed(2)}</span>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                        disabled={item.currentStock <= 0}
                        onClick={() => addToCart(item, false)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    No se encontraron productos.
                  </div>
                )}
              </>
            ) : (
              <>
                {filteredProcedures.map((proc) => (
                  <div
                    key={proc.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/20 transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-xs text-foreground truncate">{proc.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{proc.description || "Sin descripción"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">${proc.base_price.toFixed(2)}</span>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                        onClick={() => addToCart(proc, true, proc.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredProcedures.length === 0 && (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    No se encontraron servicios.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Columna Derecha: Clientes y Checkout */}
      <div className="flex flex-col space-y-4">
        {/* Panel de Cliente y Pago */}
        <Card className="rounded-2xl border border-border">
          <CardHeader className="py-4 px-6 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Receptor y Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Paciente / Tutor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Paciente / Tutor Clínico</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Seleccionar cliente (Público General)..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="general">Público General</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      🐕 {p.name} (Tutor: {p.owner_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nombre a imprimir */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del Cliente</Label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Método de Pago */}
            <div className="space-y-2">
              <Label className="text-xs">Método de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className="rounded-xl text-xs flex gap-1 items-center justify-center"
                >
                  <DollarSign className="h-4 w-4" /> Efectivo
                </Button>
                <Button
                  size="sm"
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className="rounded-xl text-xs flex gap-1 items-center justify-center"
                >
                  <CreditCard className="h-4 w-4" /> Tarjeta
                </Button>
                <Button
                  size="sm"
                  variant={paymentMethod === "transfer" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("transfer")}
                  className="rounded-xl text-xs flex gap-1 items-center justify-center"
                >
                  <Receipt className="h-4 w-4" /> Transf.
                </Button>
                <Button
                  size="sm"
                  variant={paymentMethod === "credit" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("credit")}
                  className="rounded-xl text-xs flex gap-1 items-center justify-center"
                  disabled={!selectedPatientId || selectedPatientId === "general"}
                >
                  <AlertCircle className="h-4 w-4" /> Crédito
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Financiero y Cobro */}
        <Card className="rounded-2xl border border-border flex-1 flex flex-col justify-between">
          <CardContent className="p-5 space-y-3.5">
            <h3 className="text-sm font-bold text-foreground border-b pb-2">Resumen Financiero</h3>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono font-semibold">${subtotal.toFixed(2)}</span>
            </div>

            {/* Descuentos */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground items-center">
                <span>Descuento</span>
                <div className="flex items-center gap-1">
                  <Select
                    value={discountType}
                    onValueChange={(v) => {
                      setDiscountType(v as any);
                      setDiscount(0);
                    }}
                  >
                    <SelectTrigger className="h-6 w-16 text-[10px] rounded px-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={discount || ""}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-6 w-16 text-center text-[10px] rounded px-1 font-mono"
                  />
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-destructive font-semibold">
                  <span>Monto descontado</span>
                  <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-dashed pt-3">
              <span className="text-sm font-bold">Total a Pagar</span>
              <span className="font-mono text-xl font-bold text-primary">${total.toFixed(2)}</span>
            </div>

            {/* Inputs de Cobro Efectivo */}
            {paymentMethod === "cash" && (
              <div className="bg-muted/30 border border-border rounded-xl p-3.5 space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Pago con</Label>
                  <Input
                    type="number"
                    min={total}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="h-9 w-28 text-right font-mono font-bold text-sm rounded-lg"
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Cambio</span>
                  <span className="font-mono font-bold text-green-700 text-sm">${changeDue.toFixed(2)}</span>
                </div>
              </div>
            )}

            {paymentMethod === "credit" && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 space-y-1">
                <p className="font-bold flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Venta a Crédito</p>
                <p>El total de ${total.toFixed(2)} se cargará como cuenta por cobrar al tutor registrado.</p>
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t bg-muted/20">
            <Button
              onClick={handleCheckout}
              disabled={createSale.isLoading || cart.length === 0}
              className="w-full rounded-xl py-6 bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow gap-2 text-sm"
            >
              {createSale.isLoading ? "Procesando Cobro..." : "Confirmar Cobro y Guardar"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* DIALOG 1: Apertura de Caja */}
      <Dialog open={openSessionOpen} onOpenChange={setOpenSessionOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6" onPointerDownOutside={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-700" />
              Apertura de Turno / Caja
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fondo de Caja Inicial (Efectivo)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Ej. 1000.00"
                value={initialCashInput}
                onChange={(e) => setInitialCashInput(e.target.value)}
                className="font-mono text-lg text-center font-bold h-12 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Monto de cambio inicial en caja para arrancar el turno.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleOpenSession} disabled={openSession.isLoading} className="w-full rounded-xl h-11 font-bold">
              {openSession.isLoading ? "Abriendo Turno..." : "Iniciar Turno de Caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Corte de Caja */}
      <Dialog open={closeSessionOpen} onOpenChange={setCloseSessionOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              🔒 Corte y Cierre de Caja
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {activeSession && (
              <div className="bg-muted/40 border p-3.5 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span>Fondo Inicial:</span>
                  <span>${activeSession.initial_cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Ventas Esperadas:</span>
                  <span className="font-bold text-primary">${activeSession.expected_cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Ventas Tarjeta:</span>
                  <span>${activeSession.card_sales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas Transferencia:</span>
                  <span>${activeSession.transfer_sales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas Crédito:</span>
                  <span>${activeSession.credit_sales.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Efectivo Real en Caja (Conteo Físico)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                className="font-mono text-lg text-center font-bold h-12 rounded-xl border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas y Observaciones</Label>
              <Input
                type="text"
                placeholder="Ej. Diferencia de $5 por cambio, etc."
                value={corteNotes}
                onChange={(e) => setCorteNotes(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCloseSessionOpen(false)} className="rounded-xl flex-1">
              Cancelar
            </Button>
            <Button onClick={handleCloseSession} disabled={closeSession.isLoading} className="rounded-xl flex-1 bg-red-700 text-white hover:bg-red-800 font-bold">
              {closeSession.isLoading ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Movimiento de Caja Manual */}
      <Dialog open={cashMovementOpen} onOpenChange={setCashMovementOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">💸 Registrar Movimiento de Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Movimiento</Label>
              <Select value={cashMovementType} onValueChange={(v) => setCashMovementType(v as any)}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inflow">Ingreso de Efectivo (Agregar)</SelectItem>
                  <SelectItem value="outflow">Salida de Efectivo / Gasto (Retirar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Monto ($)</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                placeholder="0.00"
                value={cashMovementAmount}
                onChange={(e) => setCashMovementAmount(e.target.value)}
                className="font-mono text-center font-bold rounded-xl h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo / Concepto *</Label>
              <Input
                type="text"
                placeholder="Ej. Retiro para compra de insumos, etc."
                value={cashMovementReason}
                onChange={(e) => setCashMovementReason(e.target.value)}
                className="text-xs rounded-xl h-10"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCashMovementOpen(false)} className="rounded-xl flex-1">
              Cancelar
            </Button>
            <Button onClick={handleCashMovementSubmit} disabled={recordCashMovement.isLoading} className="rounded-xl flex-1 font-bold">
              {recordCashMovement.isLoading ? "Registrando..." : "Guardar Movimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Cargar Receta Médica */}
      <Dialog open={prescriptionPanelOpen} onOpenChange={setPrescriptionPanelOpen}>
        <DialogContent className="max-w-[650px] rounded-2xl p-6 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recetas Clínicas Pendientes de Cobro
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border border-border rounded-xl my-4">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paciente (Tutor)</TableHead>
                  <TableHead>Procedimiento</TableHead>
                  <TableHead>Medicina Recetada</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingConsultations.map((consult) => (
                  <TableRow key={consult.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {new Date(consult.date).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-xs text-foreground">🐕 {consult.patient?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{consult.patient?.owner_name}</p>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {consult.procedure?.name} (${consult.procedure?.base_price})
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] text-foreground font-semibold max-w-[150px] truncate">
                        {consult.prescriptions?.map((p: any) => p.item?.name).join(", ") || "Sin medicamentos"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {consult.prescriptions?.length || 0} productos
                      </p>
                    </TableCell>
                    <TableCell className="p-0 text-center">
                      <Button
                        size="sm"
                        className="rounded-lg h-8 text-[10px] font-bold"
                        onClick={() => handleLoadPrescription(consult)}
                      >
                        Cobrar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {pendingConsultations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                      No hay recetas pendientes encontradas en el historial.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPrescriptionPanelOpen(false)} className="rounded-xl w-full">
              Cerrar panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
