import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import { Appointment, useCreateAppointment, useUpdateAppointment } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/useClinicData";
import { useCheckInPatient } from "@/hooks/useClinicMutations";
import { useAuth } from "@/hooks/useAuth";
import { listEmployees } from "@/lib/employees-api";

const formSchema = z.object({
  patient_id: z.string().optional(),
  owner_name: z.string().optional(),
  pet_name: z.string().optional(),
  phone: z.string().optional(),
  reason: z.string().min(1, "El motivo es requerido"),
  status: z.enum(["scheduled", "confirmed", "in_waiting_room", "completed", "cancelled"]),
  start_time: z.string().min(1, "Fecha de inicio es requerida"),
  end_time: z.string().min(1, "Fecha de fin es requerida"),
  assigned_doctor_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string; // HH:mm format
}

export function AppointmentDialog({ isOpen, onOpenChange, appointment, defaultDate, defaultTime }: Props) {
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const { data: patients = [], isLoading: loadingPatients } = usePatients();
  
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: listEmployees,
  });

  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const { mutate: checkIn } = useCheckInPatient();
  const { employee } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: "",
      owner_name: "",
      pet_name: "",
      phone: "",
      reason: "",
      status: "scheduled",
      start_time: "",
      end_time: "",
      assigned_doctor_id: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        form.reset({
          patient_id: appointment.patient_id || "",
          owner_name: appointment.owner_name || "",
          pet_name: appointment.pet_name || "",
          phone: appointment.phone || "",
          reason: appointment.reason,
          status: appointment.status,
          start_time: format(parseISO(appointment.start_time), "yyyy-MM-dd'T'HH:mm"),
          end_time: format(parseISO(appointment.end_time), "yyyy-MM-dd'T'HH:mm"),
          assigned_doctor_id: appointment.assigned_doctor_id || "",
          notes: appointment.notes || "",
        });
      } else {
        const start = defaultDate ? new Date(defaultDate) : new Date();
        if (defaultTime) {
          const [h, m] = defaultTime.split(":");
          start.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        }
        const end = new Date(start);
        end.setMinutes(start.getMinutes() + 30); // default 30 min duration

        form.reset({
          patient_id: "",
          owner_name: "",
          pet_name: "",
          phone: "",
          reason: "Consulta",
          status: "scheduled",
          start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
          end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
          assigned_doctor_id: "",
          notes: "",
        });
      }
    }
  }, [isOpen, appointment, defaultDate, defaultTime, form]);

  const patientId = form.watch("patient_id");
  const isExistingPatient = !!patientId;

  const onSubmit = async (values: FormData) => {
    // Validate if trying to move to waiting room without a registered patient
    if (values.status === "in_waiting_room" && !values.patient_id) {
      toast.error("Atención: El paciente debe estar registrado", {
        description: "Para enviar un paciente a la sala de espera, primero debes crear su expediente completo en la sección de Pacientes.",
        duration: 5000,
      });
      return;
    }

    const payload = {
      ...values,
      patient_id: values.patient_id || null,
      assigned_doctor_id: values.assigned_doctor_id || null,
      // Convert local datetime-local string back to ISO
      start_time: new Date(values.start_time).toISOString(),
      end_time: new Date(values.end_time).toISOString(),
    };

    try {
      if (appointment) {
        await updateMutation.mutateAsync({ id: appointment.id, ...payload });
        // Auto check-in if changing status to waiting room
        if (values.status === "in_waiting_room" && appointment.status !== "in_waiting_room" && payload.patient_id) {
          checkIn(
            {
              patient_id: payload.patient_id,
              checked_in_by: employee?.id ?? null,
              notes: payload.reason
            },
            {
              onSuccess: () => toast.success("Paciente añadido a la Sala de Espera")
            }
          );
        } else {
          toast.success("Cita actualizada exitosamente");
        }
      } else {
        const newAppt = await createMutation.mutateAsync(payload);
        // Auto check-in if creating straight to waiting room
        if (values.status === "in_waiting_room" && newAppt.patient_id) {
          checkIn(
            {
              patient_id: newAppt.patient_id,
              checked_in_by: employee?.id ?? null,
              notes: payload.reason
            },
            {
              onSuccess: () => toast.success("Cita creada y paciente enviado a Sala de Espera")
            }
          );
        } else {
          toast.success("Cita agendada exitosamente");
        }
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al guardar la cita", { description: e.message });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const doctors = employees.filter((e) => ["admin", "médico"].includes(e.role));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar Cita" : "Nueva Cita"}</DialogTitle>
          <DialogDescription>
            Programa una cita para un paciente existente o un nuevo prospecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar Paciente Registrado</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {patientId
                    ? patients.find((p) => p.id === patientId)?.name || "Paciente seleccionado"
                    : "Seleccionar paciente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar paciente o dueño..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
                    <CommandGroup>
                      {patients.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.owner_name}`}
                          onSelect={() => {
                            form.setValue("patient_id", p.id);
                            form.setValue("owner_name", "");
                            form.setValue("pet_name", "");
                            form.setValue("phone", p.owner_phone || "");
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              patientId === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {p.name} - {p.owner_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {!isExistingPatient && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_name">Dueño (Prospecto)</Label>
                <Input id="owner_name" {...form.register("owner_name")} placeholder="Nombre del cliente" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pet_name">Mascota</Label>
                <Input id="pet_name" {...form.register("pet_name")} placeholder="Nombre de la mascota" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...form.register("phone")} placeholder="Teléfono de contacto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_doctor_id">Médico Asignado</Label>
              <Select
                value={form.watch("assigned_doctor_id")}
                onValueChange={(val) => form.setValue("assigned_doctor_id", val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Inicio</Label>
              <Input id="start_time" type="datetime-local" {...form.register("start_time")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fin</Label>
              <Input id="end_time" type="datetime-local" {...form.register("end_time")} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input id="reason" {...form.register("reason")} required placeholder="Ej. Consulta, Vacuna..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(val: any) => form.setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programada</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="in_waiting_room">En Sala de Espera</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...form.register("notes")} placeholder="Observaciones extras..." />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cita
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
