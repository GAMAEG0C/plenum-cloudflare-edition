import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, UserCheck, UserX, AlertCircle, ArrowRight, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { listEmployees } from "@/lib/employees-api";
import { useAttendance } from "@/hooks/useHRData";
import { useClockIn, useClockOut } from "@/hooks/useHRMutations";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/checador")({
  component: ChecadorPage,
  head: () => ({ meta: [{ title: "Reloj Checador — UniversumK9 Stack" }] }),
});

function ChecadorPage() {
  const [time, setTime] = useState(new Date());
  const [employeeCode, setEmployeeCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["employees-list-checador"],
    queryFn: () => listEmployees(),
  });

  const { data: attendance = [], refetch: refetchAttendance } = useAttendance();

  const clockIn = useClockIn();
  const clockOut = useClockOut();

  // Tick the clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    return time.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [time]);

  const formattedDate = useMemo(() => {
    return time.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }, [time]);

  // Today's attendance
  const todayAttendance = useMemo(() => {
    const todayStr = new Date().toDateString();
    return attendance.filter((a) => new Date(a.clock_in).toDateString() === todayStr);
  }, [attendance]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = employeeCode.trim().toUpperCase();
    if (!code) return toast.error("Por favor ingresa tu código de empleado.");

    setIsSubmitting(true);
    try {
      // 1. Buscar el empleado por código
      const employee = employees.find((e) => e.employee_number.toUpperCase() === code);
      if (!employee) {
        toast.error(`Código de empleado "${code}" no encontrado o inactivo.`);
        setIsSubmitting(false);
        return;
      }

      if (employee.status !== "active") {
        toast.error("Tu cuenta de empleado se encuentra deshabilitada.");
        setIsSubmitting(false);
        return;
      }

      // 2. Revisar si ya tiene entrada activa (sin hora de salida)
      const activeRecord = attendance.find(
        (a) => a.employee_id === employee.id && a.clock_out === null
      );

      if (activeRecord) {
        // Registrar Salida
        clockOut.mutate(
          { attendanceId: activeRecord.id, employeeId: employee.id },
          {
            onSuccess: () => {
              toast.success(`👋 ¡Hasta luego, ${employee.first_name}! Salida registrada con éxito.`, {
                description: `Hora de salida: ${new Date().toLocaleTimeString("es-MX")}`,
                duration: 6000,
              });
              setEmployeeCode("");
              refetchAttendance();
            },
            onError: (err: any) => toast.error(err.message),
          }
        );
      } else {
        // Registrar Entrada
        clockIn.mutate(employee.id, {
          onSuccess: () => {
            toast.success(`✨ ¡Bienvenido, ${employee.first_name}! Entrada registrada con éxito.`, {
              description: `Hora de entrada: ${new Date().toLocaleTimeString("es-MX")}`,
              duration: 6000,
            });
            setEmployeeCode("");
            refetchAttendance();
          },
          onError: (err: any) => toast.error(err.message),
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el checado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Reloj y Checador */}
      <Card className="rounded-2xl border border-border shadow-sm bg-card p-6 flex flex-col justify-between items-center text-center space-y-6">
        <div className="space-y-1.5">
          <Clock className="h-10 w-10 text-primary mx-auto animate-pulse" />
          <p className="text-3xl font-mono font-bold tracking-wider text-foreground select-none">
            {formattedTime}
          </p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest select-none">
            {formattedDate}
          </p>
        </div>

        <form onSubmit={handleRegister} className="w-full space-y-4">
          <div className="space-y-2 text-left">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código de Empleado</Label>
            <Input
              type="text"
              placeholder="Ej. AD0000"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="font-mono text-center text-xl font-bold tracking-widest h-12 rounded-xl focus-visible:ring-primary border-primary/40 uppercase"
              maxLength={6}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl py-6 bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow text-sm gap-2"
          >
            {isSubmitting ? "Registrando..." : "Registrar Entrada / Salida"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/40 p-2.5 rounded-xl border border-border/60">
          <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
          <span>Ingresa tu código único de 6 dígitos asignado por tu administrador para checar tu turno.</span>
        </div>
      </Card>

      {/* Empleados Activos Hoy */}
      <Card className="rounded-2xl border border-border shadow-sm bg-card flex flex-col min-h-[400px]">
        <CardHeader className="py-4 px-5 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-700" />
            Asistencias Registradas Hoy ({todayAttendance.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-y-auto max-h-[350px] space-y-2">
          {todayAttendance.map((a) => {
            const isClockedOut = !!a.clock_out;
            return (
              <div
                key={a.id}
                className={`flex justify-between items-center p-3 rounded-xl border text-xs ${
                  isClockedOut
                    ? "bg-muted/30 text-muted-foreground border-border/50"
                    : "bg-green-50/40 text-foreground border-green-200"
                }`}
              >
                <div className="space-y-0.5">
                  <p className="font-semibold flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {a.employees?.first_name} {a.employees?.last_name}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Código: {a.employees?.employee_number}
                  </p>
                </div>
                <div className="text-right font-mono space-y-0.5">
                  <p className="text-[10px] flex items-center justify-end gap-1 font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full"></span>
                    Entrada: {new Date(a.clock_in).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {isClockedOut && (
                    <p className="text-[10px] flex items-center justify-end gap-1 text-muted-foreground">
                      <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full"></span>
                      Salida: {new Date(a.clock_out).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {todayAttendance.length === 0 && (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col justify-center items-center h-full space-y-2">
              <UserX className="h-8 w-8 text-muted-foreground/30" />
              <p>Ningún empleado ha checado entrada el día de hoy.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
