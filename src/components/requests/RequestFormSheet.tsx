import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { z } from "zod";
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
import { useCreateMovement } from "@/hooks/useInventoryMutations";

interface LineRow {
  id: string;
  itemId: string;
  quantity: number;
}

const schema = z.object({
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Select an item"),
        quantity: z.number().min(1, "Qty must be at least 1"),
      }),
    )
    .min(1, "Add at least one line item"),
});

interface RequestFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
}

export function RequestFormSheet({ open, onOpenChange, items }: RequestFormSheetProps) {
  const createMovement = useCreateMovement();
  const [lines, setLines] = useState<LineRow[]>([
    { id: crypto.randomUUID(), itemId: "", quantity: 1 },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function resetForm() {
    setLines([{ id: crypto.randomUUID(), itemId: "", quantity: 1 }]);
    setErrors({});
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), itemId: "", quantity: 1 }]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function updateLine(id: string, field: "itemId" | "quantity", value: string | number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field === "itemId") return { ...l, itemId: value as string };
        const item = itemMap.get(l.itemId);
        const max = item ? item.currentStock : 9999;
        const qty = Math.max(1, Math.min(Number(value), max));
        return { ...l, quantity: qty };
      }),
    );
  }

  function handleSubmit() {
    const result = schema.safeParse({
      lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      setErrors(fieldErrors);
      return;
    }

    let completed = 0;
    lines.forEach(l => {
      createMovement.mutate({
        itemId: l.itemId,
        type: "shipped",
        quantity: l.quantity,
        notes: "Uso interno / Clínica"
      }, {
        onSuccess: () => {
          completed++;
          if (completed === lines.length) {
            toast.success("Salida registrada correctamente");
            resetForm();
            onOpenChange(false);
          }
        },
        onError: (e) => toast.error("Error al registrar: " + e.message)
      });
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Registrar Salida</SheetTitle>
          <SheetDescription>Registra los insumos que vas a utilizar</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">

          <div className="space-y-2">
            <Label>Line Items *</Label>
            {errors["lines"] && (
              <p className="text-xs text-destructive">{errors["lines"]}</p>
            )}
            {lines.map((line, idx) => {
              const selectedItem = itemMap.get(line.itemId);
              const maxQty = selectedItem ? selectedItem.currentStock : 9999;
              return (
                <div key={line.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <Select
                      value={line.itemId || undefined}
                      onValueChange={(v) => updateLine(line.id, "itemId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items
                          .filter((i) => i.currentStock > 0)
                          .map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name} ({i.currentStock} avail)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {errors[`lines.${idx}.itemId`] && (
                      <p className="text-xs text-destructive">{errors[`lines.${idx}.itemId`]}</p>
                    )}
                  </div>
                  <div className="w-20 space-y-1">
                    <Input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, "quantity", Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="mt-0.5 shrink-0"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} className="w-full" disabled={createMovement.isLoading}>
            Confirmar Salida
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
