import { useState, useMemo, useCallback, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CSVExportButton, type CSVColumn } from "@/components/data/CSVExportButton";
import { CSVImportSheet, type ImportField } from "@/components/data/CSVImportSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CatalogTable, type SortState } from "@/components/catalog/CatalogTable";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ItemFormSheet } from "@/components/catalog/ItemFormSheet";
import { BulkActionBar } from "@/components/catalog/BulkActionBar";
import { ItemDetailSheet } from "@/components/catalog/ItemDetailSheet";
import { RowActionsMenu } from "@/components/catalog/RowActionsMenu";
import { MovementFormSheet } from "@/components/movements/MovementFormSheet";
import { printBarcodeLabels } from "@/components/catalog/PrintBarcodeLabel";
import { XMLImportDialog } from "@/components/catalog/XMLImportDialog";
import { useItems, useCategories, useSuppliers, useLocations } from "@/hooks/useInventoryData";
import { useCreateItem, useUpdateItem, useDeleteItem } from "@/hooks/useInventoryMutations";
import { PermissionGate, usePermissions } from "@/hooks/usePermissions";
import { useRole } from "@/hooks/useRole";
import type { Item } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";
import type { ItemFilters } from "@/lib/demo-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useProcedures } from "@/hooks/useClinicData";
import { useCreateProcedure, useUpdateProcedure } from "@/hooks/useClinicMutations";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CatalogSearch {
  item?: string;
  newItem?: string;
}

export const Route = createFileRoute("/app/catalog")({
  component: CatalogPage,
  head: () => ({ meta: [{ title: "Catálogo — UniversumK9 Stack" }] }),
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    item: typeof search.item === "string" ? search.item : undefined,
    newItem: typeof search.newItem === "string" ? search.newItem : undefined,
  }),
});

function CatalogPage() {
  const { item: itemId, newItem } = Route.useSearch();
  const navigate = useNavigate();

  // Auto-open create form when navigated with newItem param
  useEffect(() => {
    if (newItem) {
      setSheetOpen(true);
      navigate({ to: "/app/catalog", search: {}, replace: true });
    }
  }, [newItem, navigate]);

  const [filters, setFilters] = useState<ItemFilters>({});
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [movementItemId, setMovementItemId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [xmlImportOpen, setXmlImportOpen] = useState(false);

  const importFields = useMemo<ImportField[]>(() => [
    { key: "name", label: "Nombre", required: true },
    { key: "sku", label: "SKU", required: true },
    { key: "description", label: "Descripción" },
    { key: "category", label: "Categoría" },
    { key: "supplier", label: "Proveedor" },
    { key: "location", label: "Ubicación" },
    { key: "quantity", label: "Existencias", numeric: true },
    { key: "reorderPoint", label: "Punto de Reorden", numeric: true },
    { key: "unit", label: "Unidad" },
    { key: "costPrice", label: "Costo Unitario", numeric: true },
    { key: "sellingPrice", label: "Precio", numeric: true },
    { key: "barcode", label: "Código de Barras" },
  ], []);

  // Strip stock-level status before passing to store
  const storeFilters = useMemo(() => {
    const { status, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: allItems } = useItems(storeFilters);
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: locations } = useLocations();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { can } = usePermissions();
  const { isAdmin, isManager } = useRole();

  const { data: procedures = [] } = useProcedures();
  const createProcedure = useCreateProcedure();
  const updateProcedure = useUpdateProcedure();

  const [catalogType, setCatalogType] = useState<"items" | "procedures">("items");
  const [procDialogOpen, setProcDialogOpen] = useState(false);
  const [editProcedure, setEditProcedure] = useState<any | null>(null);
  const [procForm, setProcForm] = useState({
    name: "",
    description: "",
    base_price: "",
    commission_type: "percentage" as "percentage" | "fixed",
    commission_value: "",
    is_active: true,
  });

  const openCreateProcedure = () => {
    setEditProcedure(null);
    setProcForm({
      name: "",
      description: "",
      base_price: "",
      commission_type: "percentage",
      commission_value: "",
      is_active: true,
    });
    setProcDialogOpen(true);
  };

  const openEditProcedure = (proc: any) => {
    setEditProcedure(proc);
    setProcForm({
      name: proc.name,
      description: proc.description || "",
      base_price: String(proc.base_price),
      commission_type: proc.commission_type || "percentage",
      commission_value: String(proc.commission_value),
      is_active: proc.is_active,
    });
    setProcDialogOpen(true);
  };

  const handleSaveProcedure = () => {
    if (!procForm.name.trim()) return toast.error("El nombre del servicio es obligatorio.");
    const price = parseFloat(procForm.base_price);
    if (isNaN(price) || price < 0) return toast.error("El precio base debe ser mayor o igual a 0.");
    const commVal = parseFloat(procForm.commission_value) || 0;
    if (commVal < 0) return toast.error("El valor de comisión debe ser mayor o igual a 0.");

    const payload = {
      name: procForm.name.trim(),
      description: procForm.description.trim() || null,
      base_price: price,
      commission_type: procForm.commission_type,
      commission_value: commVal,
      is_active: procForm.is_active,
    };

    if (editProcedure) {
      updateProcedure.mutate(
        editProcedure.id,
        payload,
        {
          onSuccess: () => {
            toast.success("Servicio actualizado con éxito.");
            setProcDialogOpen(false);
          },
          onError: (err: any) => toast.error(`Error al actualizar servicio: ${err.message}`),
        }
      );
    } else {
      createProcedure.mutate(
        payload,
        {
          onSuccess: () => {
            toast.success("Servicio creado con éxito.");
            setProcDialogOpen(false);
          },
          onError: (err: any) => toast.error(`Error al crear servicio: ${err.message}`),
        }
      );
    }
  };

  // Derive detail item from URL search param
  const detailItem = useMemo(() => {
    if (!itemId) return null;
    return allItems.find((i) => i.id === itemId) ?? null;
  }, [itemId, allItems]);

  const openDetail = useCallback((item: Item) => {
    navigate({ to: "/app/catalog", search: { item: item.id } });
  }, [navigate]);

  const closeDetail = useCallback(() => {
    navigate({ to: "/app/catalog", search: {} });
  }, [navigate]);
  const items = useMemo(() => {
    let result = allItems.filter((i) => i.status !== ItemStatus.Archived);
    if (filters.status === "in-stock") result = result.filter((i) => i.currentStock > i.reorderPoint);
    else if (filters.status === "low-stock") result = result.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint);
    else if (filters.status === "out-of-stock") result = result.filter((i) => i.currentStock === 0);
    return result;
  }, [allItems, filters.status]);

  const existingSkus = useMemo(() => allItems.map((i) => i.sku), [allItems]);

  const csvColumns = useMemo<CSVColumn<Item>[]>(() => [
    { header: "Nombre", accessor: (i) => i.name },
    { header: "SKU", accessor: (i) => i.sku },
    { header: "Categoría", accessor: (i) => categories.find((c) => c.id === i.categoryId)?.name ?? "" },
    { header: "Proveedor", accessor: (i) => suppliers.find((s) => s.id === i.supplierId)?.name ?? "" },
    { header: "Ubicación", accessor: (i) => locations.find((l) => l.id === i.locationId)?.name ?? "" },
    { header: "Existencias", accessor: (i) => i.currentStock },
    { header: "Punto de Reorden", accessor: (i) => i.reorderPoint },
    { header: "Costo Unitario", accessor: (i) => i.costPrice },
    { header: "Precio", accessor: (i) => i.sellingPrice },
    { header: "Estado", accessor: (i) => i.status },
  ], [categories, suppliers, locations]);

  const handleSave = useCallback((data: Partial<Item>) => {
    if (editItem) {
      updateItem.mutate({ id: editItem.id, updates: data }, {
        onSuccess: () => { toast.success("Producto actualizado"); setSheetOpen(false); setEditItem(null); },
        onError: (e) => toast.error(e.message || "Error al actualizar producto. Por favor intenta de nuevo."),
      });
    } else {
      const newItem: Item = {
        id: crypto.randomUUID(),
        sku: data.sku ?? "",
        barcode: data.barcode ?? null,
        name: data.name ?? "",
        description: data.description ?? "",
        categoryId: data.categoryId ?? null,
        status: data.status ?? ItemStatus.Active,
        unit: data.unit ?? "each",
        currentStock: data.currentStock ?? 0,
        reorderPoint: data.reorderPoint ?? 0,
        reorderQuantity: data.reorderQuantity ?? 0,
        costPrice: data.costPrice ?? 0,
        sellingPrice: data.sellingPrice ?? 0,
        locationId: data.locationId ?? null,
        supplierId: data.supplierId ?? null,
        imageUrl: null,
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      createItem.mutate(newItem, {
        onSuccess: (inserted: any) => {
          const insertedId = inserted?.id || newItem.id;
          toast.success("Producto creado", {
            action: { label: "Deshacer", onClick: () => { deleteItem.mutate(insertedId, { onSuccess: () => toast.success("Creación de producto deshecha") }); } },
            duration: 5000,
          });
          setSheetOpen(false);
        },
        onError: (e) => toast.error(e.message || "Error al crear producto. Por favor intenta de nuevo."),
      });
    }
  }, [editItem, createItem, updateItem, deleteItem]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    const canDelete = isAdmin || isManager;
    if (canDelete) {
      deleteItem.mutate(deleteTarget.id, {
        onSuccess: () => { toast.success(`${deleteTarget.name} eliminado`); setDeleteTarget(null); },
        onError: (e) => toast.error(e.message || "Error al eliminar producto."),
      });
    } else {
      updateItem.mutate({ id: deleteTarget.id, updates: { status: ItemStatus.Archived } }, {
        onSuccess: () => { toast.success(`${deleteTarget.name} archivado`); setDeleteTarget(null); },
        onError: (e) => toast.error(e.message || "Error al archivar producto."),
      });
    }
  }, [deleteTarget, isAdmin, isManager, deleteItem, updateItem]);

  const openEdit = (item: Item) => { setEditItem(item); setSheetOpen(true); };
  const openCreate = () => { setEditItem(null); setSheetOpen(true); };

  const handleBulkUpdate = useCallback((updates: Partial<Item>) => {
    const ids = Array.from(selected);
    const count = ids.length;
    ids.forEach((id) => {
      updateItem.mutate({ id, updates });
    });
    toast.success(`${count} productos actualizados`);
    setSelected(new Set());
  }, [selected, updateItem]);

  const actionRenderer = (item: Item) => (
    <RowActionsMenu
      item={item}
      onViewDetails={(i) => openDetail(i)}
      onEdit={(i) => openEdit(i)}
      onLogMovement={(i) => setMovementItemId(i.id)}
      onDelete={(i) => setDeleteTarget(i)}
    />
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Selector de Pestañas Principal */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setCatalogType("items")}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-colors ${
            catalogType === "items"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          📦 Catálogo de Productos
        </button>
        <button
          type="button"
          onClick={() => setCatalogType("procedures")}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-colors ${
            catalogType === "procedures"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          🩺 Catálogo de Servicios / Tarifas
        </button>
      </div>

      {catalogType === "items" ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Catálogo de Productos</h1>
              <p className="text-sm text-muted-foreground">{items.length} productos</p>
            </div>
            <div className="flex items-center gap-2">
              <CSVExportButton
                data={items}
                columns={csvColumns}
                filename="universumk9-stack-items"
              />
              <PermissionGate permission="create_item">
                <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />Importar
                </Button>
              </PermissionGate>
              <PermissionGate permission="create_item">
                <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary font-semibold" onClick={() => setXmlImportOpen(true)}>
                  <Upload className="h-4 w-4" />Importar XML
                </Button>
              </PermissionGate>
              <PermissionGate permission="create_item">
                <Button onClick={openCreate} className="hidden gap-1.5 sm:inline-flex">
                  <Plus className="h-4 w-4" />Nuevo Producto
                </Button>
              </PermissionGate>
            </div>
          </div>

          <Card className="p-4">
            <CatalogFilters filters={filters} onChange={setFilters} categories={categories} suppliers={suppliers} locations={locations} />
          </Card>

          <ErrorBoundary>
          {allItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Aún no hay productos en tu inventario"
              description="Empieza a construir tu catálogo agregando tu primer producto."
              actionLabel={can("create_item") ? "Agregar Primer Producto" : undefined}
              onAction={can("create_item") ? openCreate : undefined}
            />
          ) : (
            <CatalogTable
              items={items}
              categories={categories}
              suppliers={suppliers}
              locations={locations}
              sort={sort}
              onSortChange={setSort}
              selected={selected}
              onSelectedChange={setSelected}
              onRowClick={(item) => openDetail(item)}
              actionRenderer={actionRenderer}
              showCheckboxes={can("edit_item")}
            />
          )}
          </ErrorBoundary>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Catálogo de Servicios y Procedimientos</h1>
              <p className="text-sm text-muted-foreground">{procedures.length} servicios registrados</p>
            </div>
            {(isAdmin || isManager) && (
              <Button onClick={openCreateProcedure} className="gap-1.5 inline-flex">
                <Plus className="h-4 w-4" />Nuevo Servicio
              </Button>
            )}
          </div>

          <ErrorBoundary>
            <Card className="overflow-hidden border border-border rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-32">Precio Base</TableHead>
                    <TableHead className="w-36">Comisión Médico</TableHead>
                    <TableHead className="w-28 text-center">Estado</TableHead>
                    {(isAdmin || isManager) && <TableHead className="w-24 text-right"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procedures.map((proc) => (
                    <TableRow key={proc.id}>
                      <TableCell className="font-semibold text-sm">{proc.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{proc.description || "Sin descripción"}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-primary">
                        ${Number(proc.base_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono font-semibold">
                          {proc.commission_type === "percentage" ? `${proc.commission_value}%` : `$${proc.commission_value}`}
                        </span>{" "}
                        <span className="text-muted-foreground text-[10px]">
                          ({proc.commission_type === "percentage" ? "Porcentaje" : "Fijo"})
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={proc.is_active ? "default" : "secondary"}
                          className={
                            proc.is_active
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {proc.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      {(isAdmin || isManager) && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-primary hover:bg-primary/5 hover:text-primary font-semibold rounded-lg"
                            onClick={() => openEditProcedure(proc)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {procedures.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        No hay servicios registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </ErrorBoundary>
        </>
      )}

      <ItemFormSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditItem(null); }}
        item={editItem}
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        existingSkus={existingSkus}
        onSave={handleSave}
        loading={createItem.isLoading || updateItem.isLoading}
      />

      <ItemDetailSheet
        open={!!detailItem}
        onOpenChange={(v) => { if (!v) closeDetail(); }}
        item={detailItem}
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        onEdit={(item) => { closeDetail(); openEdit(item); }}
        onArchive={(item) => { closeDetail(); setDeleteTarget(item); }}
      />

      <XMLImportDialog
        open={xmlImportOpen}
        onOpenChange={setXmlImportOpen}
        items={allItems}
        onImportComplete={() => {}}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿{isAdmin || isManager ? "Eliminar" : "Archivar"} {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin || isManager
                ? "Esta acción no se puede deshacer. El historial de movimientos se conservará pero el producto será eliminado."
                : "El producto será archivado y oculto de la vista predeterminada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{isAdmin || isManager ? "Eliminar" : "Archivar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {catalogType === "items" && (
        <PermissionGate permission="create_item">
          <button
            type="button"
            onClick={openCreate}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-accent shadow-lg transition-transform hover:scale-105 sm:hidden"
            aria-label="Nuevo Producto"
          >
            <Plus className="h-6 w-6" />
          </button>
        </PermissionGate>
      )}

      {catalogType === "procedures" && (isAdmin || isManager) && (
        <button
          type="button"
          onClick={openCreateProcedure}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-accent shadow-lg transition-transform hover:scale-105 sm:hidden"
          aria-label="Nuevo Servicio"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <PermissionGate permission="edit_item">
        <BulkActionBar
          selectedCount={selected.size}
          categories={categories}
          suppliers={suppliers}
          locations={locations}
          onUpdateCategory={(id) => handleBulkUpdate({ categoryId: id })}
          onUpdateSupplier={(id) => handleBulkUpdate({ supplierId: id })}
          onUpdateLocation={(id) => handleBulkUpdate({ locationId: id })}
          onUpdateStatus={(s) => handleBulkUpdate({ status: s })}
          onDeselectAll={() => setSelected(new Set())}
          onPrintLabels={() => {
            const selectedItems = allItems.filter((i) => selected.has(i.id));
            const locMap = new Map(locations.map((l) => [l.id, l.name]));
            printBarcodeLabels(selectedItems, locMap);
          }}
        />
      </PermissionGate>

      <MovementFormSheet
        open={!!movementItemId}
        onOpenChange={(v) => { if (!v) setMovementItemId(null); }}
        items={allItems}
        locations={locations}
        preSelectedItemId={movementItemId}
      />

      <CSVImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        fields={importFields}
        entityName="items"
        existingSkus={existingSkus}
        knownCategories={categories.map((c) => c.name)}
        knownSuppliers={suppliers.map((s) => s.name)}
        onImport={async (rows) => {
          let created = 0;
          let failed = 0;
          for (const row of rows) {
            try {
              const newItem: Item = {
                id: crypto.randomUUID(),
                sku: row.sku ?? "",
                barcode: row.barcode ?? null,
                name: row.name ?? "",
                description: row.description ?? "",
                categoryId: categories.find((c) => c.name.toLowerCase() === row.category?.toLowerCase())?.id ?? null,
                status: ItemStatus.Active,
                unit: row.unit || "each",
                currentStock: Number(row.quantity) || 0,
                reorderPoint: Number(row.reorderPoint) || 0,
                reorderQuantity: 0,
                costPrice: Number(row.costPrice) || 0,
                sellingPrice: Number(row.sellingPrice) || 0,
                locationId: locations.find((l) => l.name.toLowerCase() === row.location?.toLowerCase())?.id ?? null,
                supplierId: suppliers.find((s) => s.name.toLowerCase() === row.supplier?.toLowerCase())?.id ?? null,
                imageUrl: null,
                customFields: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              createItem.mutate(newItem);
              created++;
            } catch {
              failed++;
            }
          }
          toast.success(`Se importaron ${created} productos${failed > 0 ? `, ${failed} fallaron` : ""}`);
          return { created, failed };
        }}
      />

      {/* DIALOG DE PROCEDIMIENTOS / SERVICIOS */}
      <Dialog open={procDialogOpen} onOpenChange={setProcDialogOpen}>
        <DialogContent className="max-w-[420px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              🩺 {editProcedure ? "Editar Servicio / Tarifa" : "Nuevo Servicio / Tarifa"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura los datos del servicio para cobro en Punto de Venta y comisiones a médicos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="proc-name" className="text-xs font-semibold">Nombre del Servicio *</Label>
              <Input
                id="proc-name"
                type="text"
                placeholder="Ej. Aplicación de Vacuna, Ultrasonido..."
                value={procForm.name}
                onChange={(e) => setProcForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proc-desc" className="text-xs font-semibold">Descripción</Label>
              <Input
                id="proc-desc"
                type="text"
                placeholder="Breve descripción del procedimiento..."
                value={procForm.description}
                onChange={(e) => setProcForm((prev) => ({ ...prev, description: e.target.value }))}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="proc-price" className="text-xs font-semibold">Precio Base ($) *</Label>
                <Input
                  id="proc-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={procForm.base_price || ""}
                  onChange={(e) => setProcForm((prev) => ({ ...prev, base_price: e.target.value }))}
                  className="h-9 font-mono text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Activo</Label>
                <div className="flex items-center h-9">
                  <Switch
                    checked={procForm.is_active}
                    onCheckedChange={(checked) => setProcForm((prev) => ({ ...prev, is_active: checked }))}
                  />
                  <span className="text-xs ml-2 text-muted-foreground">
                    {procForm.is_active ? "Cobro habilitado" : "Cobro deshabilitado"}
                  </span>
                </div>
              </div>
            </div>
            <div className="border border-border rounded-xl p-3.5 bg-muted/20 space-y-3">
              <p className="text-xs font-bold text-foreground">Comisión para Médicos</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tipo</Label>
                  <Select
                    value={procForm.commission_type}
                    onValueChange={(val: "percentage" | "fixed") =>
                      setProcForm((prev) => ({ ...prev, commission_type: val }))
                    }
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proc-comm" className="text-xs font-medium">Valor de Comisión</Label>
                  <Input
                    id="proc-comm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={procForm.commission_value || ""}
                    onChange={(e) => setProcForm((prev) => ({ ...prev, commission_value: e.target.value }))}
                    className="h-9 font-mono text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setProcDialogOpen(false)} className="rounded-xl flex-1 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveProcedure} className="rounded-xl flex-1 text-xs font-bold">
              Guardar Servicio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
