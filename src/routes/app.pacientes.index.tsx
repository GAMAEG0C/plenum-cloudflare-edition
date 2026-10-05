import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usePatients, useConsultations } from "@/hooks/useClinicData";
import { useCreatePatient } from "@/hooks/useClinicMutations";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, PawPrint, Phone, Mail, User, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/app/pacientes/")({
  component: PacientesPage,
  head: () => ({ meta: [{ title: "Pacientes — UniversumK9 Stack" }] }),
});

const SPECIES = ["Perro", "Gato", "Ave", "Conejo", "Reptil", "Otro"];

interface PatientFormState {
  name: string;
  species: string;
  breed: string;
  birth_date: string;
  weight_kg: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  notes: string;
}

const emptyForm: PatientFormState = {
  name: "", species: "Perro", breed: "", birth_date: "",
  weight_kg: "", owner_name: "", owner_phone: "", owner_email: "", notes: "",
};

function PacientesPage() {
  const { data: patients = [], isLoading: loadingPatients } = usePatients();
  const { data: consultations = [], isLoading: loadingConsultations } = useConsultations();
  const { mutate: create, isLoading: creating } = useCreatePatient();
  const { can } = usePermissions();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<PatientFormState>(emptyForm);

  // Mapear la última visita de cada paciente
  const lastVisitMap = new Map<string, { date: string; diagnosis: string }>();
  consultations.forEach((c) => {
    if (!lastVisitMap.has(c.patient_id)) {
      lastVisitMap.set(c.patient_id, {
        date: c.date,
        diagnosis: c.diagnosis || "Consulta sin diagnóstico",
      });
    }
  });

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.breed ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.owner_phone ?? "").includes(search)
  );

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("El nombre del paciente es obligatorio.");
    if (!form.owner_name.trim()) return toast.error("El nombre del dueño es obligatorio.");
    create(
      {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed || null,
        birth_date: form.birth_date || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone || null,
        owner_email: form.owner_email || null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      } as any,
      {
        onSuccess: () => {
          toast.success("Paciente registrado correctamente.");
          setCreateOpen(false);
          setForm(emptyForm);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const speciesIcon = (s: string) =>
    s === "Perro" ? "🐕" : s === "Gato" ? "🐈" : s === "Ave" ? "🦜" : s === "Conejo" ? "🐇" : "🐾";

  const speciesColor = (s: string) => {
    switch (s) {
      case "Perro": return "bg-blue-50 text-blue-600";
      case "Gato": return "bg-purple-50 text-purple-600";
      case "Ave": return "bg-green-50 text-green-600";
      case "Conejo": return "bg-orange-50 text-orange-600";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  const formatLastVisit = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: es });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulta pacientes e historial clínico de tu clínica
          </p>
        </div>
        {can("manage_patients") && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm">
                <Plus className="h-4 w-4" /> Nuevo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Registrar Nuevo Paciente</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                {/* Paciente */}
                <div className="col-span-2 border-b pb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos del Paciente</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre del paciente *</Label>
                  <Input placeholder="Ej. Firulais" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Especie</Label>
                  <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{SPECIES.map((s) => <SelectItem key={s} value={s}>{speciesIcon(s)} {s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Raza</Label>
                  <Input placeholder="Ej. Labrador" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Peso (kg)</Label>
                  <Input type="number" min={0} step={0.1} placeholder="Ej. 12.5" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de nacimiento</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="rounded-lg" />
                </div>

                {/* Dueño */}
                <div className="col-span-2 border-b pb-1 mt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos del Dueño</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre del dueño *</Label>
                  <Input placeholder="Ej. Juan Pérez" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input placeholder="Ej. 614-000-0000" value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Correo electrónico</Label>
                  <Input type="email" placeholder="ejemplo@correo.com" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} className="rounded-lg" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Notas / antecedentes</Label>
                  <Textarea placeholder="Alergias, condiciones crónicas, historial relevante..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="rounded-lg resize-none" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg">Cancelar</Button>
                <Button onClick={handleSave} disabled={creating} className="rounded-lg">{creating ? "Guardando..." : "Registrar Paciente"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
        <Input
          id="search-pacientes"
          className="pl-12 pr-4 py-6 text-base rounded-xl border border-border bg-card shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary w-full"
          placeholder="Buscar por nombre, propietario o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Patients Cards List */}
      <div className="space-y-3">
        {loadingPatients || loadingConsultations ? (
          <div className="py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border shadow-sm">
            Cargando pacientes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-card rounded-2xl border border-border shadow-sm">
            <PawPrint className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No se encontraron resultados para la búsqueda." : "Aún no hay pacientes registrados en el sistema."}
            </p>
            {!search && can("manage_patients") && (
              <Button variant="outline" size="sm" className="mt-4 gap-1.5 rounded-xl" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Registrar primer paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p) => {
              const lastVisit = lastVisitMap.get(p.id);
              return (
                <Link
                  key={p.id}
                  to="/app/pacientes/$id"
                  params={{ id: p.id }}
                  className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Circle Species Icon */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl shadow-inner ${speciesColor(p.species)}`}>
                      {speciesIcon(p.species)}
                    </div>
                    {/* Pet and Owner info */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
                        {p.name}
                        {p.breed && (
                          <span className="text-xs font-normal text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                            {p.breed}
                          </span>
                        )}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                          {p.owner_name}
                        </span>
                        {p.owner_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground/60" />
                            {p.owner_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visit status & Chevron */}
                  <div className="flex items-center gap-4 shrink-0">
                    {lastVisit ? (
                      <div className="hidden sm:flex flex-col items-end gap-0.5 text-right">
                        <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200/60 rounded-lg py-0.5 px-2 text-[10px] font-bold tracking-wide uppercase">
                          Última visita
                        </Badge>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {formatLastVisit(lastVisit.date)}
                        </span>
                      </div>
                    ) : (
                      <div className="hidden sm:flex flex-col items-end gap-0.5 text-right">
                        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 rounded-lg py-0.5 px-2 text-[10px] font-bold tracking-wide uppercase">
                          Sin visitas
                        </Badge>
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button for Mobile */}
      {can("manage_patients") && (
        <div className="fixed bottom-20 right-6 z-40 sm:hidden">
          <Button
            onClick={() => setCreateOpen(true)}
            size="icon"
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground/60 text-center sm:text-left mt-2">
        Mostrando {filtered.length} de {patients.length} pacientes
      </p>
    </div>
  );
}
