import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { CustomFieldManager } from "@/components/settings/CustomFieldManager";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { ReorderDefaults } from "@/components/settings/ReorderDefaults";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { UserManagement } from "@/components/settings/UserManagement";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Configuración — UniversumK9 Stack" }] }),
});

function SettingsPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!can("access_settings")) {
      toast.error("Acceso denegado");
      navigate({ to: "/app/dashboard" });
    }
  }, [can, navigate]);

  if (!can("access_settings")) return null;

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground">Configuración y gestión del sistema</p>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="custom-fields">Campos Personalizados</TabsTrigger>
          <TabsTrigger value="locations">Ubicaciones</TabsTrigger>
          <TabsTrigger value="reorder-defaults">Puntos de Reorden</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="categories">
            <ErrorBoundary><CategoryManager /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="custom-fields">
            <ErrorBoundary><CustomFieldManager /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="locations">
            <ErrorBoundary><LocationSettings /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="reorder-defaults">
            <ErrorBoundary><ReorderDefaults /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="users">
            <ErrorBoundary><UserManagement /></ErrorBoundary>
          </TabsContent>
          <TabsContent value="system">
            <ErrorBoundary><SystemSettings /></ErrorBoundary>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
