import { createFileRoute, Link } from "@tanstack/react-router";

import { useState, useMemo, useEffect } from "react";
import { useConsultations, usePatients, useProcedures } from "@/hooks/useClinicData";
import { useCreateConsultation } from "@/hooks/useClinicMutations";
import { useAdmitPatient } from "@/hooks/useHospitalization";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { listEmployees } from "@/lib/employees-api";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Stethoscope, Search, ChevronDown, ChevronRight, Pill, Trash2, ArrowLeft, ArrowRight, Check, Bed, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface SearchParams {
  patientId?: string;
}

export const Route = createFileRoute("/app/consultas")({
  component: ConsultasPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      patientId: search.patientId as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Consultas — UniversumK9 Stack" }] }),
});

function useItems() {
  return useQuery({
    queryKey: ["items-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id,name,sku,unit,current_stock").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useEmployees() {
  return useQuery({
    queryKey: ["employees-list"],
    queryFn: () => listEmployees(),
  });
}

interface PrescriptionLine {
  item_id: string;
  quantity: number;
  instructions: string;
}

interface ConsultForm {
  patient_id: string;
  attended_by: string;
  procedure_id: string;
  date: string;
  observations: string;
  diagnosis: string;
  notes: string;
  anamnesis: string;
}

const emptyForm: ConsultForm = {
  patient_id: "", attended_by: "", procedure_id: "",
  date: "",
  observations: "", diagnosis: "", notes: "", anamnesis: "",
};

function ConsultasPage() {
  const { patientId } = Route.useSearch();
  const { data: consultations = [], isLoading } = useConsultations();
  const { data: patients = [] } = usePatients();
  const { data: procedures = [] } = useProcedures();
  const { data: employees = [] } = useEmployees();
  const { data: items = [] } = useItems();
  const { mutate: create, isLoading: creating } = useCreateConsultation();
  const { can } = usePermissions();
  const { employee } = useAuth();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState<ConsultForm>(emptyForm);
  const [prescriptions, setPrescriptions] = useState<PrescriptionLine[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Hospitalization state
  const { mutateAsync: admitPatient, isPending: admitting } = useAdmitPatient();
  const [internModalOpen, setInternModalOpen] = useState(false);
  const [internForm, setInternForm] = useState<{ cage_number: string; status: 'estable' | 'delicado' | 'crítico' }>({ cage_number: "", status: "estable" });

  // Cargar fecha actual por defecto en el cliente
  useEffect(() => {
    setForm(f => ({
      ...f,
      date: new Date().toISOString().slice(0, 16),
      attended_by: employee?.id ?? ""
    }));
  }, [employee]);

  // Si viene con parametro patientId, pre-seleccionar y abrir
  useEffect(() => {
    if (patientId && patients.length > 0) {
      setForm(f => ({ ...f, patient_id: patientId }));
      setCreateOpen(true);
      setWizardStep(1);
    }
  }, [patientId, patients]);

  const medicos = employees.filter((e) => ["admin", "manager", "médico"].includes(e.role));

  const filtered = consultations.filter(
    (c) =>
      (c.patient?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.employee?.first_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.diagnosis ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const addPrescription = () =>
    setPrescriptions((prev) => [...prev, { item_id: "", quantity: 1, instructions: "" }]);

  const removePrescription = (i: number) =>
    setPrescriptions((prev) => prev.filter((_, idx) => idx !== i));

  const updatePrescription = (i: number, field: keyof PrescriptionLine, val: any) =>
    setPrescriptions((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!form.patient_id) return toast.error("Selecciona un paciente.");
      if (!form.attended_by) return toast.error("Selecciona el médico que atendió.");
      if (!form.procedure_id) return toast.error("Selecciona el tipo de procedimiento.");
    } else if (wizardStep === 2) {
      if (!form.anamnesis.trim()) return toast.error("La anamnesis es obligatoria.");
      if (!form.diagnosis.trim()) return toast.error("El diagnóstico es obligatorio.");
    }
    setWizardStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setWizardStep(prev => prev - 1);
  };

  const handleSave = () => {
    const validPrescriptions = prescriptions.filter((p) => p.item_id && p.quantity > 0);

    create(
      { ...form, prescriptions: validPrescriptions },
      {
        onSuccess: () => {
          toast.success("Consulta registrada correctamente.");
          setCreateOpen(false);
          setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 16), attended_by: employee?.id ?? "" });
          setPrescriptions([]);
          setWizardStep(1);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleInternConfirm = async () => {
    if (!internForm.cage_number) {
      toast.error("Número de jaula requerido.");
      return;
    }
    
    const validPrescriptions = prescriptions.filter((p) => p.item_id && p.quantity > 0);
      
    // 1. Guardar la consulta
    create(
      { ...form, prescriptions: validPrescriptions },
      {
        onSuccess: async () => {
          try {
            // 2. Ingresar a hospitalización
            await admitPatient({
              patient_id: form.patient_id,
              cage_number: internForm.cage_number,
              critical_level: internForm.status as 'estable' | 'delicado' | 'crítico',
              status: 'admitted',
              reason: form.diagnosis || form.observations,
              attending_doctor_id: employee?.id ?? null,
            });

            toast.success("Consulta registrada y paciente internado exitosamente.");
            
            // Resetear forms y modales
            setInternModalOpen(false);
            setCreateOpen(false);
            setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 16), attended_by: employee?.id ?? "" });
            setPrescriptions([]);
            setWizardStep(1);
            setInternForm({ cage_number: "", status: "estable" });
          } catch (e: any) {
            toast.error("Consulta guardada, pero error al internar", { description: e.message });
          }
        },
        onError: (e) => toast.error("Error al registrar consulta", { description: e.message }),
      }
    );
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Consultas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historial de consultas clínicas y atenciones médicas
          </p>
        </div>
        {can("log_consultation") && (
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setWizardStep(1); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm" id="btn-nueva-consulta">
                <Plus className="h-4 w-4" /> Nueva Consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Registrar Nueva Consulta</DialogTitle>
                
                {/* Wizard Progress Indicator */}
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {wizardStep > 1 ? <Check className="h-4 w-4" /> : "1"}
                    </div>
                    <span className={`text-xs font-semibold ${wizardStep === 1 ? "text-primary" : "text-muted-foreground"}`}>Datos</span>
                  </div>
                  <div className={`h-0.5 w-10 ${wizardStep >= 2 ? "bg-primary" : "bg-muted"}`} />
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {wizardStep > 2 ? <Check className="h-4 w-4" /> : "2"}
                    </div>
                    <span className={`text-xs font-semibold ${wizardStep === 2 ? "text-primary" : "text-muted-foreground"}`}>Diagnóstico</span>
                  </div>
                  <div className={`h-0.5 w-10 ${wizardStep >= 3 ? "bg-primary" : "bg-muted"}`} />
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      3
                    </div>
                    <span className={`text-xs font-semibold ${wizardStep === 3 ? "text-primary" : "text-muted-foreground"}`}>Receta</span>
                  </div>
                </div>
              </DialogHeader>

              {/* Step 1: Basic details */}
              {wizardStep === 1 && (
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <Label>Paciente *</Label>
                      <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                        <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar paciente..." /></SelectTrigger>
                        <SelectContent className="max-h-56 overflow-y-auto">
                          {patients.filter((p) => p.is_active).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              🐕 {p.name} (Tutor: {p.owner_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>Procedimiento *</Label>
                      <Select value={form.procedure_id} onValueChange={(v) => setForm({ ...form, procedure_id: v })}>
                        <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar procedimiento..." /></SelectTrigger>
                        <SelectContent>
                          {procedures.filter((p) => p.is_active).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} - ${p.base_price}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Médico que atendió *</Label>
                      <Select value={form.attended_by} onValueChange={(v) => setForm({ ...form, attended_by: v })}>
                        <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar médico..." /></SelectTrigger>
                        <SelectContent>
                          {medicos.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.first_name} {e.last_name} ({e.employee_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha y hora</Label>
                      <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-lg" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: SOAP clinical diagnosis */}
              {wizardStep === 2 && (
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Anamnesis *</Label>
                    <Textarea rows={2} placeholder="Información provista por el cliente (motivo de visita, antecedentes, etc.)..." value={form.anamnesis} onChange={(e) => setForm({ ...form, anamnesis: e.target.value })} className="rounded-lg resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observaciones</Label>
                    <Textarea rows={2} placeholder="Hallazgos físicos, signos vitales, temperatura, estado general..." value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="rounded-lg resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Interpretación / Diagnósticos diferenciales y presuntivos</Label>
                    <Textarea rows={2} placeholder="Interpretación médica, diagnósticos presuntivos o diferenciales..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Diagnóstico definitivo *</Label>
                    <Textarea rows={2} placeholder="Diagnóstico final/definitivo..." value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="rounded-lg resize-none" />
                  </div>
                </div>
              )}

              {/* Step 3: Prescriptions / Inventory discount */}
              {wizardStep === 3 && (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm font-bold flex items-center gap-1.5">
                        <Pill className="h-4 w-4 text-primary" />
                        Tratamiento & Medicamentos
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Asocia productos del inventario y define su posología</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addPrescription} className="gap-1 h-8 text-xs rounded-lg">
                      <Plus className="h-3.5 w-3.5" /> Agregar Medicamento
                    </Button>
                  </div>

                  {prescriptions.map((p, i) => {
                    const selectedItem = items.find((it: any) => it.id === p.item_id) as any;
                    const stock = selectedItem?.current_stock ?? 0;
                    const isLowStock = stock <= p.quantity;

                    return (
                      <div key={i} className="p-4 bg-muted/30 rounded-xl border border-border space-y-3 relative">
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive absolute top-3 right-3 hover:bg-red-50" onClick={() => removePrescription(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-3 gap-3 pr-8">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Producto / Medicamento</Label>
                            <Select value={p.item_id} onValueChange={(v) => updatePrescription(i, "item_id", v)}>
                              <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                              <SelectContent className="max-h-48">
                                {items.map((item: any) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} (Stock: {item.current_stock})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Cantidad</Label>
                            <Input className="h-9 text-xs rounded-lg" type="number" min={1} value={p.quantity} onChange={(e) => updatePrescription(i, "quantity", parseInt(e.target.value) || 1)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Indicaciones / Posología</Label>
                          <Input className="h-9 text-xs rounded-lg" placeholder="Ej. 1 tableta vía oral cada 12 horas por 7 días" value={p.instructions} onChange={(e) => updatePrescription(i, "instructions", e.target.value)} />
                        </div>
                        {selectedItem && (
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-muted-foreground">Disponibilidad en almacén: <span className="font-semibold text-foreground">{stock} {selectedItem.unit}</span></span>
                            {isLowStock && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 py-0 px-1.5 text-[9px] rounded-md font-bold uppercase tracking-wider">
                                Stock Insuficiente
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {prescriptions.length === 0 && (
                    <div className="py-8 text-center bg-muted/20 border border-dashed rounded-xl space-y-2">
                      <Pill className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">Sin medicamentos recetados para esta consulta.</p>
                      <p className="text-[10px] text-muted-foreground/60">Los medicamentos prescritos se descontarán automáticamente del almacén al guardar.</p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="mt-4 pt-4 border-t gap-2 flex items-center justify-between">
                <div>
                  {wizardStep > 1 && (
                    <Button type="button" variant="outline" onClick={handlePrevStep} className="rounded-lg gap-1.5">
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-lg">Cancelar</Button>
                  {wizardStep < 3 ? (
                    <Button type="button" onClick={handleNextStep} className="rounded-lg gap-1.5">
                      Siguiente <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSave} disabled={creating || admitting} variant="outline" className="rounded-lg gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        <LogOut className="h-4 w-4" /> Finalizar y Alta
                      </Button>
                      <Button onClick={() => setInternModalOpen(true)} disabled={creating || admitting} className="rounded-lg gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm">
                        <Bed className="h-4 w-4" /> Finalizar e Internar
                      </Button>
                    </div>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de Internamiento Rápido */}
        <Dialog open={internModalOpen} onOpenChange={setInternModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Bed className="h-5 w-5 text-primary" /> Confirmar Internamiento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Número de Jaula *</Label>
                <Input
                  placeholder="Ej. J-01, UCI-2..."
                  value={internForm.cage_number}
                  onChange={(e) => setInternForm({ ...internForm, cage_number: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado Inicial *</Label>
                <Select
                  value={internForm.status}
                  onValueChange={(val: 'estable' | 'delicado' | 'crítico') => setInternForm({ ...internForm, status: val })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estable">Controlado (Estable)</SelectItem>
                    <SelectItem value="delicado">Delicado (Precaución)</SelectItem>
                    <SelectItem value="crítico">Crítico (Intensivo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setInternModalOpen(false)} className="rounded-lg">Cancelar</Button>
              <Button onClick={handleInternConfirm} disabled={creating || admitting} className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/95">
                {creating || admitting ? "Procesando..." : "Confirmar e Internar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
        <Input
          id="search-consultas"
          className="pl-12 pr-4 py-6 text-base rounded-xl border border-border bg-card shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary w-full"
          placeholder="Buscar por paciente, médico o diagnóstico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Consultations List (Collapsible Table) */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando consultas...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "Sin resultados para esa búsqueda." : "Aún no hay consultas registradas."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Fecha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Dueño</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead>Procedimiento</TableHead>
                <TableHead>Diagnóstico</TableHead>
                <TableHead>Receta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <>
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer transition-colors ${isExpanded ? "bg-muted/30" : "hover:bg-muted/10"}`}
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="font-semibold">{new Date(c.date).toLocaleDateString("es-MX")}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.date), { addSuffix: true, locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {c.patient ? (
                          <Link to="/app/pacientes/$id" params={{ id: c.patient.id }} className="hover:text-primary hover:underline">
                            🐕 {c.patient.name}
                          </Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.patient?.owner_name ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {c.employee ? `${c.employee.first_name} ${c.employee.last_name}` : "—"}
                      </TableCell>
                      <TableCell>
                        {c.procedure ? (
                          <Badge variant="outline" className="text-xs font-bold rounded-lg py-0.5 px-2 bg-muted/40">{c.procedure.name}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-foreground/80 font-medium" title={c.diagnosis ?? ""}>
                        {c.diagnosis ?? "—"}
                      </TableCell>
                      <TableCell>
                        {(c.prescriptions?.length ?? 0) > 0 ? (
                          <Badge variant="secondary" className="gap-1 text-xs rounded-lg font-bold">
                            <Pill className="h-3.5 w-3.5 text-primary" />{c.prescriptions!.length}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${c.id}-exp`} className="bg-muted/15">
                        <TableCell colSpan={8} className="py-4 px-6 border-t border-border/60">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            {c.anamnesis && (
                              <div className="space-y-1 md:col-span-2">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Anamnesis</p>
                                <p className="text-foreground font-medium leading-relaxed bg-card p-3 rounded-xl border border-border shadow-inner">{c.anamnesis}</p>
                              </div>
                            )}
                            {c.observations && (
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Observaciones</p>
                                <p className="text-foreground font-medium leading-relaxed bg-card p-3 rounded-xl border border-border shadow-inner">{c.observations}</p>
                              </div>
                            )}
                            {c.notes && (
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Interpretación / Diagnósticos diferenciales y presuntivos</p>
                                <p className="text-foreground leading-relaxed bg-card p-3 rounded-xl border border-border shadow-inner">{c.notes}</p>
                              </div>
                            )}
                            {(c.prescriptions?.length ?? 0) > 0 && (
                              <div className="col-span-1 md:col-span-2 space-y-2 border-t pt-3">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                  <Pill className="h-3.5 w-3.5 text-primary" />
                                  Tratamiento prescrito
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {c.prescriptions!.map((rx) => (
                                    <div key={rx.id} className="flex flex-col gap-1 bg-card border border-border rounded-xl p-3 shadow-inner">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-foreground">{rx.item?.name ?? "?"}</span>
                                        <Badge variant="outline" className="font-bold font-mono text-[10px] bg-primary/5 text-primary border-primary/20 rounded-md">
                                          {rx.quantity} {rx.item?.unit || "u."}
                                        </Badge>
                                      </div>
                                      {rx.instructions && (
                                        <p className="text-xs text-muted-foreground italic mt-0.5">
                                          {rx.instructions}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground/60 text-center sm:text-left mt-2">
        Mostrando {filtered.length} de {consultations.length} consultas
      </p>
    </div>
  );
}
