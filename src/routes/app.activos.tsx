import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, isPast, isToday, addDays, isBefore } from "date-fns";
import { Monitor, Plus, Wrench, ShieldAlert, CheckCircle2, History, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useFixedAssets, useCreateFixedAsset, useMaintenanceLogs, useCreateMaintenanceLog, useUpdateAssetStatus } from "@/hooks/useFixedAssets";

export const Route = createFileRoute("/app/activos")({
  component: ActivosPage,
});

const ASSET_CATEGORIES = [
  "Imagenología (Rayos X, Ultrasonido)",
  "Quirófano (Anestesia, Monitores)",
  "Laboratorio",
  "Cómputo / TI",
  "Mobiliario Médico",
  "Vehículos",
  "Otro"
];

function ActivosPage() {
  const { data: assets = [], isLoading: loadingAssets } = useFixedAssets();
  const createAsset = useCreateFixedAsset();
  const createLog = useCreateMaintenanceLog();
  const updateStatus = useUpdateAssetStatus();

  // Create Asset Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: "",
    model: "",
    serial_number: "",
    category: "",
    purchase_date: "",
    purchase_price: "",
  });

  // Maintenance Dialog
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    cost: "",
    performed_by: "",
    next_due_date: "",
  });

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAsset.mutateAsync({
      name: assetForm.name,
      model: assetForm.model,
      serial_number: assetForm.serial_number,
      category: assetForm.category,
      purchase_date: assetForm.purchase_date || null,
      purchase_price: assetForm.purchase_price ? Number(assetForm.purchase_price) : null,
      status: "active",
    });
    setCreateDialogOpen(false);
    setAssetForm({ name: "", model: "", serial_number: "", category: "", purchase_date: "", purchase_price: "" });
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    await createLog.mutateAsync({
      asset_id: selectedAsset.id,
      maintenance_date: maintenanceForm.maintenance_date,
      description: maintenanceForm.description,
      cost: maintenanceForm.cost ? Number(maintenanceForm.cost) : 0,
      performed_by: maintenanceForm.performed_by,
      next_due_date: maintenanceForm.next_due_date || null,
    });
    setMaintenanceDialogOpen(false);
    setMaintenanceForm({ maintenance_date: format(new Date(), "yyyy-MM-dd"), description: "", cost: "", performed_by: "", next_due_date: "" });
  };

  const getStatusBadge = (asset: any) => {
    if (asset.status === 'retired') return <Badge variant="secondary">Dado de Baja</Badge>;
    if (asset.status === 'maintenance') return <Badge variant="outline" className="text-orange-600 border-orange-600">En Mantenimiento</Badge>;
    
    if (!asset.next_maintenance_date) return <Badge variant="default" className="bg-green-600">Activo (Sin Mantenimiento)</Badge>;
    
    const dueDate = new Date(asset.next_maintenance_date);
    const today = new Date();
    const nextWeek = addDays(today, 7);

    if (isBefore(dueDate, today)) {
      return <Badge variant="destructive">Mantenimiento Vencido</Badge>;
    }
    if (isBefore(dueDate, nextWeek)) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Servicio Próximo</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Activo</Badge>;
  };

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activos Fijos</h1>
            <p className="text-muted-foreground">Control de equipo médico, maquinaria y mantenimientos.</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Registrar Equipo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Equipos</CardTitle>
            <Monitor className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground">Inventario tecnológico</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Mantenimiento</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{assets.filter(a => a.status === 'maintenance').length}</div>
            <p className="text-xs text-muted-foreground">Equipos fuera de servicio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servicios Urgentes</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {assets.filter(a => a.next_maintenance_date && isBefore(new Date(a.next_maintenance_date), new Date())).length}
            </div>
            <p className="text-xs text-muted-foreground">Mantenimientos vencidos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Activos</CardTitle>
          <CardDescription>Visualiza el estado de tus máquinas y programa sus servicios preventivos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>No. Serie</TableHead>
                <TableHead>Próx. Servicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No has registrado ningún activo fijo.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.model}</div>
                    </TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell className="font-mono text-xs">{asset.serial_number || 'N/A'}</TableCell>
                    <TableCell>
                      {asset.next_maintenance_date ? format(new Date(asset.next_maintenance_date), "dd/MM/yyyy") : "No Programado"}
                    </TableCell>
                    <TableCell>{getStatusBadge(asset)}</TableCell>
                    <TableCell className="text-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedAsset(asset);
                        setMaintenanceDialogOpen(true);
                      }}>
                        <Wrench className="h-4 w-4 mr-2" /> Servicio
                      </Button>
                      {asset.status === 'active' ? (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: asset.id, status: 'maintenance' })}>
                          Falla
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: asset.id, status: 'active' })}>
                          Activar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE ASSET DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Activo Fijo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAsset} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nombre del Equipo</Label>
              <Input required placeholder="Ej. Máquina de Anestesia Mindray" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={assetForm.model} onChange={e => setAssetForm({...assetForm, model: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Número de Serie</Label>
                <Input value={assetForm.serial_number} onChange={e => setAssetForm({...assetForm, serial_number: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={assetForm.category} onValueChange={(val) => setAssetForm({...assetForm, category: val})}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Compra</Label>
                <Input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm({...assetForm, purchase_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Precio de Compra ($)</Label>
                <Input type="number" step="0.01" value={assetForm.purchase_price} onChange={e => setAssetForm({...assetForm, purchase_price: e.target.value})} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createAsset.isPending}>
              {createAsset.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Equipo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MAINTENANCE DIALOG */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Servicio Técnico</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <form onSubmit={handleCreateLog} className="space-y-4 mt-2">
              <div className="font-semibold">{selectedAsset.name}</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha del Servicio</Label>
                  <Input type="date" required value={maintenanceForm.maintenance_date} onChange={e => setMaintenanceForm({...maintenanceForm, maintenance_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Costo de Reparación ($)</Label>
                  <Input type="number" step="0.01" value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm, cost: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Técnico / Empresa</Label>
                <Input required placeholder="Nombre de quien realizó el servicio" value={maintenanceForm.performed_by} onChange={e => setMaintenanceForm({...maintenanceForm, performed_by: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Reporte de Servicio (Descripción)</Label>
                <Input required placeholder="Cambio de filtro, calibración, etc." value={maintenanceForm.description} onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})} />
              </div>

              <div className="space-y-2 p-3 bg-muted rounded-md mt-4">
                <Label>Programar Próximo Servicio Preventivo (Opcional)</Label>
                <Input type="date" value={maintenanceForm.next_due_date} onChange={e => setMaintenanceForm({...maintenanceForm, next_due_date: e.target.value})} />
                <p className="text-xs text-muted-foreground mt-1">El sistema te alertará automáticamente al acercarse esta fecha.</p>
              </div>

              <Button type="submit" className="w-full" disabled={createLog.isPending}>
                {createLog.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Bitácora"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
