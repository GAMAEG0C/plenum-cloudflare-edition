import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCreateItem, useCreateMovement } from "@/hooks/useInventoryMutations";
import { ItemStatus } from "@/types/inventory";
import type { Item } from "@/types/inventory";

interface XMLConcept {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  costPrice: number;
  unit: string;
  matchedItemId: string; // ID from catalog, or "__new__" to create new
  batchNumber: string;
  expiryDate: string;
}

interface XMLImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  onImportComplete: () => void;
}

export function XMLImportDialog({
  open,
  onOpenChange,
  items,
  onImportComplete,
}: XMLImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [concepts, setConcepts] = useState<XMLConcept[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const createItem = useCreateItem();
  const createMovement = useCreateMovement();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/xml" && !file.name.endsWith(".xml")) {
      toast.error("El archivo debe ser un XML válido (.xml)");
      return;
    }

    setXmlFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        let xmlConcepts = Array.from(xmlDoc.getElementsByTagName("cfdi:Concepto"));
        if (xmlConcepts.length === 0) {
          xmlConcepts = Array.from(xmlDoc.getElementsByTagName("Concepto"));
        }

        if (xmlConcepts.length === 0) {
          toast.error("No se encontraron conceptos de facturación en el XML.");
          return;
        }

        const parsed: XMLConcept[] = xmlConcepts.map((node, i) => {
          const sku = node.getAttribute("NoIdentificacion") || "";
          const name = node.getAttribute("Descripcion") || "";
          const qty = parseFloat(node.getAttribute("Cantidad") || "1");
          const cost = parseFloat(node.getAttribute("ValorUnitario") || "0");
          const unit = node.getAttribute("Unidad") || "pz";

          // Buscar coincidencia en el catálogo por SKU o Nombre
          let matchedItemId = "__new__";
          const matchBySku = items.find(
            (item) => item.sku.toLowerCase() === sku.toLowerCase() && sku
          );
          const matchByName = items.find(
            (item) => item.name.toLowerCase() === name.toLowerCase()
          );

          if (matchBySku) {
            matchedItemId = matchBySku.id;
          } else if (matchByName) {
            matchedItemId = matchByName.id;
          }

          return {
            id: `xml-row-${i}`,
            sku: sku || `XML-${Date.now()}-${i}`,
            name,
            quantity: qty,
            costPrice: cost,
            unit,
            matchedItemId,
            batchNumber: "",
            expiryDate: "",
          };
        });

        setConcepts(parsed);
        toast.success(`Factura cargada. ${parsed.length} conceptos listos para reconciliar.`);
      } catch (err) {
        console.error(err);
        toast.error("Error al procesar el archivo XML. Verifica el formato.");
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateConcept = (id: string, field: keyof XMLConcept, value: string) => {
    setConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveConcept = (id: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleReset = () => {
    setXmlFile(null);
    setConcepts([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (concepts.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;

    try {
      for (const concept of concepts) {
        let finalItemId = concept.matchedItemId;

        // 1. Si está marcado para crearse como nuevo, crearlo en el catálogo primero
        if (concept.matchedItemId === "__new__") {
          const newItemId = crypto.randomUUID();
          const newItem = {
            id: newItemId,
            sku: concept.sku,
            barcode: null,
            name: concept.name,
            description: `Importado vía XML. Concepto original: ${concept.name}`,
            categoryId: null,
            status: ItemStatus.Active,
            unit: concept.unit,
            currentStock: 0, 
            reorderPoint: 0,
            reorderQuantity: 0,
            costPrice: concept.costPrice,
            sellingPrice: concept.costPrice * 1.3, 
            locationId: null,
            supplierId: null,
            imageUrl: null,
            customFields: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await new Promise<void>((resolve, reject) => {
            createItem.mutate(newItem, {
              onSuccess: (inserted: any) => {
                finalItemId = inserted?.id || newItemId;
                resolve();
              },
              onError: (e) => reject(e),
            });
          });
        }

        // 2. Registrar el movimiento de Entrada (Recepción) con la cantidad y el lote/caducidad
        await new Promise<void>((resolve, reject) => {
          createMovement.mutate(
            {
              itemId: finalItemId,
              type: "received" as any,
              quantity: concept.quantity,
              notes: `Entrada por XML factura ${xmlFile?.name || ""}. Lote: ${concept.batchNumber || "S/L"}`,
              batchNumber: concept.batchNumber.trim() || null,
              expiryDate: concept.expiryDate || null,
            },
            {
              onSuccess: () => {
                successCount++;
                resolve();
              },
              onError: (e) => reject(e),
            }
          );
        });
      }

      toast.success(`Importación finalizada. ${successCount} productos ingresados al inventario.`);
      onImportComplete();
      onOpenChange(false);
      handleReset();
    } catch (e: any) {
      console.error(e);
      toast.error(`Error al importar: ${e.message || "Error desconocido"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) handleReset(); }}>
      <DialogContent className="max-w-[850px] w-[95vw] rounded-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Cargar Factura XML (CFDI 4.0 MX)
          </DialogTitle>
        </DialogHeader>

        {!xmlFile ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-12 bg-muted/20 my-4 space-y-4">
            <Upload className="h-12 w-12 text-muted-foreground/40 animate-pulse" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">Selecciona la factura XML</p>
              <p className="text-xs text-muted-foreground">Formato XML del SAT (CFDI 4.0 o 3.3)</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xml"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl shadow-sm">
              Buscar XML
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 my-4 space-y-4">
            <div className="flex items-center justify-between bg-muted/30 border p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold truncate max-w-[280px]">{xmlFile.name}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-xs text-destructive rounded-lg" onClick={handleReset}>
                Cambiar factura
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto border border-border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-3">Concepto Factura (XML)</th>
                    <th className="p-3">Vincular con Catálogo</th>
                    <th className="p-3">Cantidad</th>
                    <th className="p-3">Lote & Vencimiento</th>
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {concepts.map((concept) => (
                    <tr key={concept.id} className="hover:bg-muted/10">
                      <td className="p-3 max-w-[200px]">
                        <p className="font-semibold text-foreground truncate" title={concept.name}>
                          {concept.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          SKU XML: {concept.sku} | Costo XML: ${concept.costPrice.toFixed(2)}
                        </p>
                      </td>

                      <td className="p-3 min-w-[220px]">
                        <Select
                          value={concept.matchedItemId}
                          onValueChange={(v) => handleUpdateConcept(concept.id, "matchedItemId", v)}
                        >
                          <SelectTrigger className="h-9 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            <SelectItem value="__new__" className="text-primary font-semibold">
                              ✨ Crear como Producto Nuevo
                            </SelectItem>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                📦 {item.name} ({item.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="p-3 w-20">
                        <Input
                          type="number"
                          value={concept.quantity}
                          onChange={(e) =>
                            handleUpdateConcept(concept.id, "quantity", e.target.value)
                          }
                          className="h-9 text-xs rounded-lg font-mono text-center font-bold"
                          min={0.1}
                          step={0.1}
                        />
                      </td>

                      <td className="p-3 min-w-[220px]">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="text"
                            placeholder="Lote"
                            value={concept.batchNumber}
                            onChange={(e) =>
                              handleUpdateConcept(concept.id, "batchNumber", e.target.value)
                            }
                            className="h-9 text-xs rounded-lg font-mono"
                          />
                          <Input
                            type="date"
                            value={concept.expiryDate}
                            onChange={(e) =>
                              handleUpdateConcept(concept.id, "expiryDate", e.target.value)
                            }
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-red-50 rounded-md"
                          onClick={() => handleRemoveConcept(concept.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Nota:</strong> Los productos marcados como <em>Crear como Producto Nuevo</em> se darán de alta automáticamente en el catálogo con un margen sugerido del 30%.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4 gap-2 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          {xmlFile && (
            <Button
              onClick={handleImport}
              disabled={isProcessing || concepts.length === 0}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm gap-1.5"
            >
              {isProcessing ? "Importando..." : "Importar Factura"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
