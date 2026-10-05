import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { format, addDays, subDays, startOfDay, endOfDay, parseISO, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/agenda")({
  component: AgendaPage,
});

function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [defaultTime, setDefaultTime] = useState<string | undefined>();

  const startDate = startOfDay(currentDate);
  const endDate = endOfDay(currentDate);

  const { data: appointments = [], isLoading } = useAppointments(startDate, endDate);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

  const openDialog = (time?: string, appt?: Appointment) => {
    setSelectedAppointment(appt || null);
    setDefaultTime(time);
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-200";
      case "confirmed": return "bg-green-100 text-green-800 border-green-200";
      case "in_waiting_room": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-white text-gray-800 border-gray-200";
    }
  };

  const positionedAppointments = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
    const clusters: Appointment[][] = [];
    let currentCluster: Appointment[] = [];
    let clusterEnd = 0;

    sorted.forEach(appt => {
      const start = parseISO(appt.start_time).getTime();
      const end = parseISO(appt.end_time).getTime();
      if (currentCluster.length === 0 || start >= clusterEnd) {
        if (currentCluster.length > 0) clusters.push(currentCluster);
        currentCluster = [appt];
        clusterEnd = end;
      } else {
        currentCluster.push(appt);
        clusterEnd = Math.max(clusterEnd, end);
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    const layout: { appt: Appointment, col: number, maxCols: number }[] = [];
    clusters.forEach(cluster => {
      const cols: Appointment[][] = [];
      cluster.forEach(appt => {
        const start = parseISO(appt.start_time).getTime();
        let placed = false;
        for (let i = 0; i < cols.length; i++) {
          const lastEnd = parseISO(cols[i][cols[i].length - 1].end_time).getTime();
          if (start >= lastEnd) {
            cols[i].push(appt);
            placed = true;
            break;
          }
        }
        if (!placed) cols.push([appt]);
      });

      cluster.forEach(appt => {
        const colIdx = cols.findIndex(col => col.includes(appt));
        layout.push({ appt, col: colIdx, maxCols: cols.length });
      });
    });
    return layout;
  }, [appointments]);

  return (
    <div className="flex h-full flex-col space-y-4 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground">Administra las citas y horarios de la clínica.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center min-w-[200px] font-semibold">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => openDialog(undefined)} className="ml-2">
            <Plus className="mr-2 h-4 w-4" /> Nueva Cita
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="flex-1 overflow-auto bg-white/50 backdrop-blur-sm border-muted shadow-sm">
        <div className="min-w-[800px] relative">
          {/* Time column + Grid */}
          <div className="grid grid-cols-[80px_1fr] divide-x">
            
            {/* Timeline */}
            <div className="flex flex-col divide-y bg-muted/20">
              {hours.map((h) => (
                <div key={h} className="h-20 pr-4 text-right text-sm text-muted-foreground pt-2">
                  {h}:00
                </div>
              ))}
            </div>

            {/* Events area */}
            <div className="relative flex flex-col divide-y bg-white">
              {hours.map((h) => (
                <div 
                  key={h} 
                  className="h-20 w-full hover:bg-muted/10 cursor-pointer transition-colors relative group"
                  onClick={() => openDialog(`${h.toString().padStart(2, '0')}:00`)}
                >
                  <div className="hidden group-hover:block absolute left-2 top-2 text-xs text-muted-foreground/50">
                    Clic para agendar a las {h}:00
                  </div>
                </div>
              ))}

              {/* Render Appointments */}
              {positionedAppointments.map(({ appt, col, maxCols }) => {
                const start = parseISO(appt.start_time);
                const end = parseISO(appt.end_time);
                
                // Calculate position based on 7:00 AM start
                const startHour = start.getHours();
                const startMinute = start.getMinutes();
                const duration = differenceInMinutes(end, start);
                
                const topOffset = ((startHour - 7) * 80) + (startMinute / 60 * 80);
                const height = (duration / 60) * 80;

                // Ensure it's within the visible bounds (7am to 8pm)
                if (startHour < 7 || startHour >= 21) return null;

                const widthPercentage = 100 / maxCols;
                const leftPercentage = col * widthPercentage;

                const isShort = duration <= 30;
                const isVeryShort = duration <= 15;

                return (
                  <div
                    key={appt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDialog(undefined, appt);
                    }}
                    className={cn(
                      "absolute rounded-md border shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer overflow-hidden hover:z-10 flex flex-col justify-start",
                      isShort ? "px-2 py-0.5" : "p-2",
                      getStatusColor(appt.status)
                    )}
                    style={{
                      top: `${topOffset}px`,
                      height: `${height}px`,
                      minHeight: isVeryShort ? '24px' : undefined,
                      left: `calc(${leftPercentage}% + 8px)`,
                      width: `calc(${widthPercentage}% - 16px)`,
                    }}
                  >
                    <div className={cn("font-semibold truncate", isShort ? "text-xs leading-tight mt-0.5" : "text-sm")}>
                      {appt.patient?.name || appt.pet_name} {isVeryShort ? "" : `- ${appt.reason}`}
                    </div>
                    {!isVeryShort && (
                      <div className="text-[10px] opacity-90 truncate leading-none mt-1">
                        {format(start, "HH:mm")} - {format(end, "HH:mm")}
                        {appt.doctor && ` • Dr. ${appt.doctor.last_name}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <AppointmentDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        appointment={selectedAppointment}
        defaultDate={currentDate}
        defaultTime={defaultTime}
      />
    </div>
  );
}
