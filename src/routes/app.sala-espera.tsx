import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useWaitingRoom, usePatients } from "@/hooks/useClinicData";
import { useCheckInPatient, useUpdateWaitingStatus } from "@/hooks/useClinicMutations";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Stethoscope, Clock, LogOut, Play, Check, ChevronRight, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/app/sala-espera")({
  component: SalaEsperaPage,
  head: () => ({ meta: [{ title: "Sala de Espera — UniversumK9 Stack" }] }),
});

function SalaEsperaPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { employee } = useAuth();

  const { data: queue = [], isLoading, refetch } = useWaitingRoom();
  const { data: patients = [] } = usePatients();
  const { mutate: checkIn, isLoading: checkingIn } = useCheckInPatient();
  const { mutate: updateStatus } = useUpdateWaitingStatus();

  const [search, setSearch] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [showDischarged, setShowDischarged] = useState(false);

  // Filtrar cola
  const filteredQueue = queue.filter((entry) => {
    const matchesSearch =
      (entry.patient?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (entry.patient?.owner_name ?? "").toLowerCase().includes(search.toLowerCase());
    
    if (showDischarged) {
      return matchesSearch;
    }
    return matchesSearch && entry.status !== "discharged";
  });

  const handleCheckIn = () => {
    if (!selectedPatientId) return toast.error("Selecciona un paciente.");
    checkIn(
      {
        patient_id: selectedPatientId,
        checked_in_by: employee?.id ?? null,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Paciente ingresado a la sala de espera.");
          setCheckInOpen(false);
          setSelectedPatientId("");
          setNotes("");
          refetch();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleStatusChange = (id: string, nextStatus: "waiting" | "in_consultation" | "discharged") => {
    updateStatus(id, nextStatus, {
      onSuccess: () => {
        toast.success(`Estado actualizado.`);
        refetch();
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const speciesIcon = (s: string) =>
    s === "Perro" ? "🐕" : s === "Gato" ? "🐈" : s === "Ave" ? "🦜" : s === "Conejo" ? "🐇" : "🐾";

  const statusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 rounded-lg font-bold">Esperando</Badge>;
      case "in_consultation":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-lg font-bold">En Consulta</Badge>;
      case "discharged":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-lg font-bold">De Alta</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary animate-pulse" />
            Sala de Espera
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cola de pacientes en espera de consulta y en atención médica
          </p>
        </div>
        {can("manage_patients") && (
          <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm">
                <Plus className="h-4 w-4" /> Ingresar Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Ingresar Paciente a Espera</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Seleccionar Paciente *</Label>
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      {patients.filter((p) => p.is_active).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          🐕 {p.name} (Tutor: {p.owner_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Síntomas / Motivo de visita (Opcional)</Label>
                  <Textarea
                    placeholder="Ej. Viene por vacunas, cojera en pata trasera, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="rounded-lg resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCheckInOpen(false)} className="rounded-lg">Cancelar</Button>
                <Button onClick={handleCheckIn} disabled={checkingIn} className="rounded-lg">
                  {checkingIn ? "Ingresando..." : "Ingresar a Espera"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-waiting-room"
            className="pl-9 rounded-xl border border-border"
            placeholder="Buscar por paciente o tutor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showDischarged ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDischarged(!showDischarged)}
            className="rounded-lg text-xs"
          >
            {showDischarged ? "Ocultar dados de alta" : "Mostrar dados de alta"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando sala de espera...</div>
        ) : filteredQueue.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No hay pacientes en espera en este momento.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Motivo / Síntomas</TableHead>
                <TableHead>Ingresado por</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueue.map((entry) => {
                const checkedInTime = formatDistanceToNow(new Date(entry.check_in_time), { addSuffix: true, locale: es });
                
                return (
                  <TableRow key={entry.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-foreground">
                      {entry.patient ? (
                        <Link to="/app/pacientes/$id" params={{ id: entry.patient.id }} className="hover:text-primary hover:underline flex items-center gap-1.5">
                          <span>{speciesIcon(entry.patient.species)}</span>
                          {entry.patient.name}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-semibold">
                      {checkedInTime}
                    </TableCell>
                    <TableCell>
                      {statusBadge(entry.status)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80 max-w-[200px] truncate" title={entry.notes || ""}>
                      {entry.notes || <span className="text-xs text-muted-foreground italic">Ninguno</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.employee ? `${entry.employee.first_name} ${entry.employee.last_name}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {entry.status === "waiting" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(entry.id, "in_consultation")}
                            className="h-8 text-xs gap-1 rounded-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                            title="Llamar a consulta"
                          >
                            <Play className="h-3 w-3 fill-current" /> Llamar
                          </Button>
                        )}
                        {entry.status === "in_consultation" && can("log_consultation") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Cambiamos el estado a discharged e iniciamos registro de consulta
                              handleStatusChange(entry.id, "discharged");
                              navigate({ to: "/app/consultas", search: { patientId: entry.patient_id } });
                            }}
                            className="h-8 text-xs gap-1 rounded-lg border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                            title="Registrar Consulta"
                          >
                            <Stethoscope className="h-3.5 w-3.5" /> Atender
                          </Button>
                        )}
                        {entry.status !== "discharged" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleStatusChange(entry.id, "discharged")}
                            className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-red-50"
                            title="Dar de alta / Retirar de sala"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold">Atendido</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-xs text-muted-foreground/60">
        Mostrando {filteredQueue.length} registros en la sala
      </p>
    </div>
  );
}
export default SalaEsperaPage;
