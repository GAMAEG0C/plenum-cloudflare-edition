import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useItems } from "@/hooks/useInventoryData";
import { useCreateMovement } from "@/hooks/useInventoryMutations";
import { MovementType, type StockMovement } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/salidas")({
  component: SalidasPage,
});

function SalidasPage() {
  const { data: items, isLoading } = useItems();
  const { mutate, isLoading: isSaving } = useCreateMovement();
  const { employee } = useAuth();
  
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reasonType, setReasonType] = useState<"interno" | "externo" | "venta" | "merma">("interno");
  const [reference, setReference] = useState("");
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!itemId) errs.itemId = "Debes seleccionar un producto";

    const num = Number(quantity);
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0 || !Number.isInteger(num)) {
      errs.quantity = "La cantidad debe ser un número entero positivo";
    }

    const selectedItem = items?.find((i) => i.id === itemId);
    if (!errs.quantity && selectedItem) {
      if (qty > selectedItem.currentStock) {
        errs.quantity = `Stock insuficiente. Disponible: ${selectedItem.currentStock}`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const qty = parseInt(quantity, 10);
    const selectedItem = items?.find((i) => i.id === itemId);
    
    const finalNotes = `[${reasonType.toUpperCase()}] ${reference}`.trim();

    // Quick checkout is always a negative movement (Shipped/Salida)
    const movement: StockMovement = {
      id: crypto.randomUUID(),
      itemId,
      type: MovementType.Shipped,
      quantity: -qty, // Negative quantity to reduce stock
      fromLocationId: null,
      toLocationId: null,
      reference,
      notes: finalNotes,
      performedBy: employee ? `${employee.first_name} ${employee.last_name}` : "Empleado",
      createdAt: new Date().toISOString(),
    };

    mutate(movement, {
      onSuccess: () => {
        const label = selectedItem?.name ?? "Producto";
        toast.success(`Salida registrada: -${qty} ${label}`, { duration: 5000 });
        // Reset form
        setItemId("");
        setQuantity("");
        setReasonType("interno");
        setReference("");
        setErrors({});
      },
      onError: (e) => toast.error(e.message || "Error al registrar la salida."),
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Registro Rápido de Salidas</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona el material que tomaste y la cantidad para descontarlo del inventario. Tu nombre quedará registrado automáticamente en el movimiento.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando inventario...</div>
        ) : (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block font-medium">1. ¿Qué producto vas a tomar?</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      "w-full justify-between h-12 bg-background font-normal",
                      !itemId && "text-muted-foreground"
                    )}
                  >
                    {itemId && items
                      ? (() => {
                          const i = items.find((x) => x.id === itemId);
                          return i ? `${i.sku} - ${i.name} (Disp: ${i.currentStock} ${i.unit})` : "Busca y selecciona un producto...";
                        })()
                      : "Busca y selecciona un producto..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar producto por nombre o SKU..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún producto.</CommandEmpty>
                      <CommandGroup>
                        {items?.filter(i => i.currentStock > 0).map((i) => (
                          <CommandItem
                            key={i.id}
                            value={`${i.sku} ${i.name}`}
                            onSelect={() => {
                              setItemId(i.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                itemId === i.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {i.sku} - {i.name} (Disp: {i.currentStock} {i.unit})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.itemId && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.itemId}</p>}
            </div>

            <div>
              <Label className="mb-2 block font-medium">2. ¿Cuántas unidades tomaste?</Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="Ejemplo: 2"
                className="h-12 bg-background text-lg"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors.quantity && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.quantity}</p>}
            </div>

            <div>
              <Label className="mb-3 block font-medium">3. Tipo de Salida</Label>
              <RadioGroup value={reasonType} onValueChange={(v: any) => setReasonType(v)} className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="interno" id="r-interno" />
                  <Label htmlFor="r-interno" className="font-normal cursor-pointer">Paciente Interno</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="externo" id="r-externo" />
                  <Label htmlFor="r-externo" className="font-normal cursor-pointer">Paciente Externo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="venta" id="r-venta" />
                  <Label htmlFor="r-venta" className="font-normal cursor-pointer">Venta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="merma" id="r-merma" />
                  <Label htmlFor="r-merma" className="font-normal cursor-pointer">Merma</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-2 block font-medium">4. Motivo o Paciente (Opcional)</Label>
              <Textarea
                placeholder="Ej. Para uso en quirófano, paciente Max..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                rows={3}
                className="bg-background"
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={isSaving} className="h-12 w-full text-base font-medium">
                {isSaving ? "Registrando salida..." : "Confirmar Salida"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
