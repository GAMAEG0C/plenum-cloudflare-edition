import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, isPast, isToday, addHours, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, Plus, Syringe, HeartPulse, Stethoscope, AlertTriangle, MessageSquare, ClipboardCheck, ArrowRight, Loader2, Pill, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

import { 
  useActiveHospitalizations, 
  useHospitalTreatments, 
  useHospitalNotes,
  useAdmitPatient,
  useDischargePatient,
  useAddTreatment,
  useAdministerTreatment,
  useAddHospitalNote
} from "@/hooks/useHospitalization";
import { usePatients } from "@/hooks/useClinicData";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/hospitalizacion")({
  component: HospitalizacionPage,
});

function HospitalizacionPage() {
  const { employee } = useAuth();
  const { data: hospitalizations = [], isLoading: loadingHosp } = useActiveHospitalizations();
  const { data: patients = [] } = usePatients();

  const admit = useAdmitPatient();
  const discharge = useDischargePatient();

  // Dialogs
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    patient_id: "",
    cage_number: "",
    reason: "",
    critical_level: "estable" as any,
  });

  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await admit.mutateAsync({
      patient_id: admitForm.patient_id,
      cage_number: admitForm.cage_number,
      reason: admitForm.reason,
      critical_level: admitForm.critical_level,
      status: "admitted",
      attending_doctor_id: employee?.id,
    });
    setAdmitOpen(false);
    setAdmitForm({ patient_id: "", cage_number: "", reason: "", critical_level: "estable" });
  };

  const criticalColor = {
    estable: "bg-blue-100 text-blue-800 border-blue-300",
    delicado: "bg-yellow-100 text-yellow-800 border-yellow-300",
    crítico: "bg-red-100 text-red-800 border-red-300"
  };

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8 bg-slate-50/50 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pizarrón de Hospitalización</h1>
            <p className="text-muted-foreground">Monitoreo de pacientes internados en tiempo real.</p>
          </div>
          <Button onClick={() => setAdmitOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Ingresar Paciente
          </Button>
        </div>
      </div>

      {hospitalizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HeartPulse className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Sin pacientes internados</h3>
          <p className="text-muted-foreground mt-1">El área de hospitalización está vacía en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {hospitalizations.map((h) => (
            <Card 
              key={h.id} 
              className={`cursor-pointer transition-all hover:shadow-md border-t-4 ${
                h.critical_level === 'crítico' ? 'border-t-red-500' : 
                h.critical_level === 'delicado' ? 'border-t-yellow-500' : 'border-t-blue-500'
              }`}
              onClick={() => setSelectedPatient(h)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{h.patient?.name}</CardTitle>
                    <CardDescription>{h.patient?.species} • {h.patient?.breed}</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono bg-white shadow-sm">
                    Jaula {h.cage_number || '?'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3 text-sm">
                <div className="flex items-center text-muted-foreground mb-2">
                  <Stethoscope className="w-4 h-4 mr-1" />
                  <span className="truncate">{h.reason}</span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Badge className={criticalColor[h.critical_level]} variant="outline">
                    {h.critical_level.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Ingresó: {format(new Date(h.admission_date), "dd/MM HH:mm")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ingreso Dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Ingreso a Hospital</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={admitForm.patient_id} onValueChange={v => setAdmitForm({...admitForm, patient_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.owner_name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número/Nombre de Jaula</Label>
                <Input required value={admitForm.cage_number} onChange={e => setAdmitForm({...admitForm, cage_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nivel de Gravedad</Label>
                <Select value={admitForm.critical_level} onValueChange={v => setAdmitForm({...admitForm, critical_level: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estable">Estable</SelectItem>
                    <SelectItem value="delicado">Delicado</SelectItem>
                    <SelectItem value="crítico">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo de Ingreso / Diagnóstico Presuntivo</Label>
              <Input required value={admitForm.reason} onChange={e => setAdmitForm({...admitForm, reason: e.target.value})} />
            </div>
            <Button type="submit" className="w-full" disabled={admit.isPending || !admitForm.patient_id}>
              {admit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Admitir Paciente"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Patient Detail Drawer */}
      <PatientDrawer 
        hospitalization={selectedPatient} 
        open={!!selectedPatient} 
        onClose={() => setSelectedPatient(null)} 
        employeeId={employee?.id || ""}
      />

    </div>
  );
}

function PatientDrawer({ hospitalization, open, onClose, employeeId }: { hospitalization: any, open: boolean, onClose: () => void, employeeId: string }) {
  if (!hospitalization) return null;

  const discharge = useDischargePatient();
  const { data: treatments = [] } = useHospitalTreatments(hospitalization.id);
  const { data: notes = [] } = useHospitalNotes(hospitalization.id);
  const addTreatment = useAddTreatment();
  const administer = useAdministerTreatment();
  const addNote = useAddHospitalNote();

  const [tForm, setTForm] = useState({ medication: "", dosage: "", freq: "", next_time: format(addHours(new Date(), 1), "HH:mm") });
  const [noteContent, setNoteContent] = useState("");

  const pendingTreatments = treatments.filter(t => t.status === "pending");
  const administeredTreatments = treatments.filter(t => t.status === "administered");

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = format(new Date(), "yyyy-MM-dd");
    await addTreatment.mutateAsync({
      hospitalization_id: hospitalization.id,
      medication_or_task: tForm.medication,
      dosage: tForm.dosage,
      frequency_hours: tForm.freq ? Number(tForm.freq) : null,
      next_due_time: `${today}T${tForm.next_time}:00`,
      status: "pending"
    });
    setTForm({ medication: "", dosage: "", freq: "", next_time: format(addHours(new Date(), 1), "HH:mm") });
  };

  const handleAdminister = async (t: any) => {
    let nextVars = undefined;
    if (t.frequency_hours) {
      const nextTime = addHours(new Date(), t.frequency_hours);
      nextVars = {
        hospitalization_id: hospitalization.id,
        medication_or_task: t.medication_or_task,
        dosage: t.dosage,
        frequency_hours: t.frequency_hours,
        next_due_time: nextTime.toISOString(),
        status: "pending"
      };
    }
    await administer.mutateAsync({
      id: t.id,
      employeeId,
      createNext: !!t.frequency_hours,
      nextVars
    });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    await addNote.mutateAsync({
      hospitalization_id: hospitalization.id,
      author_id: employeeId,
      content: noteContent
    });
    setNoteContent("");
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <SheetTitle className="text-2xl">{hospitalization.patient?.name}</SheetTitle>
              <SheetDescription className="text-base text-foreground mt-1">
                Jaula {hospitalization.cage_number} • Ingresado por {hospitalization.doctor?.first_name}
              </SheetDescription>
            </div>
            <Button variant="destructive" size="sm" className="mr-8" onClick={async () => {
              await discharge.mutateAsync(hospitalization.id);
              onClose();
            }}>Dar de Alta</Button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Treatments Section */}
          <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-3 border-b">
              <CardTitle className="text-lg flex items-center">
                <Syringe className="w-5 h-5 mr-2 text-indigo-600" />
                Pizarrón de Dosis (Pendientes)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {pendingTreatments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No hay medicamentos pendientes.</p>
              ) : (
                <div className="space-y-3">
                  {pendingTreatments.map(t => {
                    const dueTime = new Date(t.next_due_time);
                    const minsDiff = differenceInMinutes(dueTime, new Date());
                    const isUrgent = minsDiff <= 15;
                    const isLate = minsDiff < 0;

                    return (
                      <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border ${isLate ? 'bg-red-50 border-red-200' : isUrgent ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50'}`}>
                        <div>
                          <div className="font-semibold flex items-center">
                            {isLate && <AlertTriangle className="w-4 h-4 text-red-600 mr-1" />}
                            {t.medication_or_task}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t.dosage && <span className="mr-2">Dosis: {t.dosage}</span>}
                            <span className={`font-medium ${isLate ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-blue-600'}`}>
                              Toca a las: {format(dueTime, "HH:mm")}
                            </span>
                            {t.frequency_hours && <span className="ml-2">• Cada {t.frequency_hours}h</span>}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleAdminister(t)} className="bg-indigo-600 hover:bg-indigo-700">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Aplicado
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 border-t flex-col items-stretch space-y-3">
              <div className="text-sm font-medium text-slate-700">Agregar Indicación Médica</div>
              <form onSubmit={handleAddTreatment} className="flex gap-2 items-end">
                <div className="space-y-1 flex-1">
                  <Input placeholder="Medicina (ej. Tramadol)" value={tForm.medication} onChange={e => setTForm({...tForm, medication: e.target.value})} required />
                </div>
                <div className="space-y-1 w-24">
                  <Input placeholder="Dosis" value={tForm.dosage} onChange={e => setTForm({...tForm, dosage: e.target.value})} />
                </div>
                <div className="space-y-1 w-20">
                  <Input type="number" placeholder="Hrs" value={tForm.freq} onChange={e => setTForm({...tForm, freq: e.target.value})} />
                </div>
                <div className="space-y-1 w-24">
                  <Input type="time" required value={tForm.next_time} onChange={e => setTForm({...tForm, next_time: e.target.value})} />
                </div>
                <Button type="submit" size="icon" disabled={!tForm.medication}><Plus className="w-4 h-4" /></Button>
              </form>
            </CardFooter>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-slate-600" />
                Bitácora y Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-48 pr-4 mb-4">
                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No hay observaciones.</p>
                  ) : (
                    notes.map(n => (
                      <div key={n.id} className="bg-slate-50 p-3 rounded-lg text-sm border">
                        <div className="text-slate-800">{n.content}</div>
                        <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                          <span>{n.author?.first_name} {n.author?.last_name}</span>
                          <span>{format(new Date(n.created_at), "dd/MM HH:mm")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <form onSubmit={handleAddNote} className="flex gap-2">
                <Input placeholder="Escribe una observación de cambio de turno..." value={noteContent} onChange={e => setNoteContent(e.target.value)} required />
                <Button type="submit" variant="secondary"><ArrowRight className="w-4 h-4" /></Button>
              </form>
            </CardContent>
          </Card>

          {/* History */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 flex items-center">
              <ClipboardCheck className="w-4 h-4 mr-2 text-green-600" />
              Historial de Dosis Aplicadas hoy
            </h4>
            <div className="space-y-2">
              {administeredTreatments.filter(t => isToday(new Date(t.administered_at!))).map(t => (
                <div key={t.id} className="text-xs flex justify-between items-center bg-green-50 text-green-800 p-2 rounded">
                  <span><Pill className="w-3 h-3 inline mr-1" />{t.medication_or_task} ({t.dosage})</span>
                  <span>{format(new Date(t.administered_at!), "HH:mm")} por {t.administered_by?.first_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
