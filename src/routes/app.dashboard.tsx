import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

import { useStockSummary } from "@/hooks/useInventoryData";

import { useOnboarding, type TourStep } from "@/hooks/useOnboarding";

const TOUR_STEPS: TourStep[] = [
  { title: "¡Bienvenido a UniversumK9 Stack!", description: "Demos un recorrido rápido por las funciones principales. Solo tomará un minuto." },
  { target: "sidebar", title: "Navegación", description: "Usa la barra lateral para cambiar entre secciones — catálogo, movimientos, proveedores y más." },
  { target: "metrics", title: "Salud del inventario", description: "La salud de tu inventario a simple vista — total de SKUs, en existencia, existencia baja y agotados." },
  { target: "needs-attention", title: "Requiere atención", description: "Los artículos que necesitan acción aparecen aquí — bajo stock, órdenes atrasadas y solicitudes pendientes." },
  { target: "search", title: "Búsqueda rápida", description: "Presiona CMD+K (o Ctrl+K) para buscar cualquier cosa — artículos, proveedores, órdenes y más." },
  { title: "¡Todo listo!", description: "Explora la aplicación o prueba el tutorial guiado para aprender el flujo de trabajo principal. ¡Feliz gestión!" },
];

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Panel General — UniversumK9 Stack" }] }),
});

function DashboardPage() {
  const { data: summary } = useStockSummary();


  const tour = useOnboarding("dashboard");
  

  // Auto-start tour logic removed per user request

  const handleTourComplete = () => {
    tour.completeTour();
    toast.success("¡Recorrido completado! Explora libremente o inicia el tutorial.");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Panel General</h1>
        <p className="text-sm text-muted-foreground">Bienvenido — este es el resumen actual del inventario.</p>
      </div>

      <div data-tour="metrics" className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total de SKUs" value={summary.total} accentColor="neutral" icon={Package} />
          <MetricCard label="En existencia" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} />
          <MetricCard label="Existencia baja" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} />
          <MetricCard label="Agotado" value={summary.outOfStock} accentColor="danger" icon={XCircle} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div data-tour="needs-attention" className="min-h-0"><NeedsAttention /></div>
        <div className="min-h-0"><RecentActivity /></div>
      </div>


      <OnboardingTour
        steps={TOUR_STEPS}
        currentStep={tour.currentStep}
        isActive={tour.isActive}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={tour.skipTour}
        onComplete={handleTourComplete}
      />

      
    </div>
  );
}
