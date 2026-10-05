import { Users, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UserManagement() {
  return (
    <Card className="max-w-md mx-auto rounded-2xl border border-border shadow-sm bg-card overflow-hidden">
      <CardHeader className="text-center pt-8 pb-4">
        <div className="mx-auto rounded-full bg-primary/10 p-4 border border-primary/20 text-primary w-16 h-16 flex items-center justify-center mb-3">
          <Users className="h-8 w-8" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Gestión de Usuarios y Personal
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground mt-1">
          Administración centralizada de empleados
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8 text-center space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Para garantizar una gestión de accesos segura, los roles de empleado (Admin, Médico, Auxiliar), activación/desactivación de cuentas y restablecimiento de contraseñas se administran en la sección central de **Empleados**.
        </p>
        <Button asChild className="w-full rounded-xl py-6 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow text-sm gap-2">
          <Link to="/app/empleados">
            Ir a Administración de Empleados
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
