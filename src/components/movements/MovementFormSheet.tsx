import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MovementType } from "@/types/inventory";
import type { Item, Location, StockMovement } from "@/types/inventory";
import { useCreateMovement } from "@/hooks/useInventoryMutations";

interface MovementFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  locations: Location[];
  /** Pre-selected item (locks the field) */
  preSelectedItemId?: string | null;
}

const TYPE_OPTIONS = [
  { value: MovementType.Received, label: "Recepción" },
  { value: MovementType.Shipped, label: "Salida" },
  { value: MovementType.Adjusted, label: "Ajuste" },
  { value: MovementType.Transferred, label: "Transferencia" },
];

function directionForType(type: MovementType): "in" | "out" | "configurable" {
  if (type === MovementType.Received) return "in";
  if (type === MovementType.Shipped) return "out";
  if (type === MovementType.Transferred) return "out";
  return "configurable";
}

export function MovementFormSheet({
  open,
  onOpenChange,
  items,
  locations,
  preSelectedItemId,
}: MovementFormSheetProps) {
  const { mutate, isLoading } = useCreateMovement();

  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<MovementType>(MovementType.Received);
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [reference, setReference] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setItemId(preSelectedItemId ?? "");
      setType(MovementType.Received);
      setQuantity("");
      setDirection("in");
      setReference("");
      setFromLocationId("");
      setToLocationId("");
      setBatchNumber("");
      setExpiryDate("");
      setErrors({});
    }
  }, [open, preSelectedItemId]);

  // Auto-set direction when type changes
  useEffect(() => {
    const dir = directionForType(type);
    if (dir !== "configurable") setDirection(dir);
  }, [type]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!itemId) errs.itemId = "El producto es obligatorio";

    const num = Number(quantity);
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0 || !Number.isInteger(num)) {
      errs.quantity = "La cantidad debe ser un número entero positivo";
    }

    const selectedItem = items.find((i) => i.id === itemId);

    if (!errs.quantity && selectedItem && (type === MovementType.Shipped || (type === MovementType.Transferred))) {
      if (qty > selectedItem.currentStock) {
        errs.quantity = `Existencia insuficiente. Cantidad actual: ${selectedItem.currentStock}`;
      }
    }

    if (!errs.quantity && selectedItem && type === MovementType.Adjusted && direction === "out") {
      if (qty > selectedItem.currentStock) {
        errs.quantity = `Existencia insuficiente. Cantidad actual: ${selectedItem.currentStock}`;
      }
    }

    if (type === MovementType.Adjusted && !reference.trim()) {
      errs.reference = "El motivo del ajuste es obligatorio";
    }

    if (type === MovementType.Transferred) {
      if (!fromLocationId) errs.fromLocationId = "La ubicación de origen es obligatoria";
      if (!toLocationId) errs.toLocationId = "La ubicación de destino es obligatoria";
      if (fromLocationId && toLocationId && fromLocationId === toLocationId) {
        errs.toLocationId = "El origen y destino deben ser diferentes";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const qty = parseInt(quantity, 10);
    const selectedItem = items.find((i) => i.id === itemId);
    const signedQty = direction === "in" ? qty : -qty;

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      itemId,
      type,
      quantity: signedQty,
      fromLocationId: type === MovementType.Transferred ? fromLocationId || null : null,
      toLocationId: type === MovementType.Transferred ? toLocationId || null : null,
      reference,
      notes: reference,
      performedBy: "Demo User",
      createdAt: new Date().toISOString(),
      batchNumber: direction === "in" && batchNumber.trim() ? batchNumber.trim() : null,
      expiryDate: direction === "in" && expiryDate ? expiryDate : null,
    };

    mutate(movement, {
      onSuccess: () => {
        const label = selectedItem?.name ?? itemId;
        const sign = direction === "in" ? "+" : "−";
        toast.success(`Movimiento registrado: ${sign}${qty} ${label} (${type})`, {
          duration: 5000,
        });
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message || "Error al registrar el movimiento. Intenta de nuevo."),
    });
  };

  const isTransfer = type === MovementType.Transferred;
  const isAdjusted = type === MovementType.Adjusted;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar Movimiento</SheetTitle>
          <SheetDescription>Registra una entrada, salida o ajuste de inventario.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Item */}
          <div>
            <Label className="mb-1.5 block text-sm">Producto *</Label>
            <Select
              value={itemId || "__none__"}
              onValueChange={(v) => setItemId(v === "__none__" ? "" : v)}
              disabled={!!preSelectedItemId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Selecciona un producto</SelectItem>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.itemId && <p className="mt-1 text-xs text-destructive">{errors.itemId}</p>}
          </div>

          {/* Type */}
          <div>
            <Label className="mb-1.5 block text-sm">Tipo de Movimiento</Label>
            <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <Label className="mb-1.5 block text-sm">Cantidad *</Label>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="Ingresa la cantidad"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {errors.quantity && <p className="mt-1 text-xs text-destructive">{errors.quantity}</p>}
          </div>

          {/* Lote y Fecha de Vencimiento (solo para Entradas) */}
          {direction === "in" && (
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">Lote / ID de Lote</Label>
                <Input
                  type="text"
                  placeholder="Ej. LOT-2026-A"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold">Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Direction (only for adjusted) */}
          {isAdjusted && (
            <div>
              <Label className="mb-1.5 block text-sm">Dirección</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "in" | "out")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada (agregar stock)</SelectItem>
                  <SelectItem value="out">Salida (restar stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Transfer locations */}
          {isTransfer && (
            <>
              <div>
                <Label className="mb-1.5 block text-sm">Ubicación Origen</Label>
                <Select value={fromLocationId || "__none__"} onValueChange={(v) => setFromLocationId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Selecciona ubicación</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.fromLocationId && <p className="mt-1 text-xs text-destructive">{errors.fromLocationId}</p>}
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Ubicación Destino</Label>
                <Select value={toLocationId || "__none__"} onValueChange={(v) => setToLocationId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Selecciona ubicación</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.toLocationId && <p className="mt-1 text-xs text-destructive">{errors.toLocationId}</p>}
              </div>
            </>
          )}

          {/* Reference note */}
          <div>
            <Label className="mb-1.5 block text-sm">Referencia / Nota{isAdjusted ? " *" : ""}</Label>
            <Textarea
              placeholder={isAdjusted ? "Motivo del ajuste (obligatorio)" : "Nota u referencia opcional"}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={3}
            />
            {errors.reference && <p className="mt-1 text-xs text-destructive">{errors.reference}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              {isLoading ? "Guardando…" : "Guardar Movimiento"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
