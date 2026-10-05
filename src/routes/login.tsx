import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { tenantConfig } from "@/config/tenant";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signInWithEmployeeNumber, isAuthenticated, loading } = useAuth();

  const [empNumber, setEmpNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: "/app/dashboard" });
  }, [loading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signInWithEmployeeNumber(empNumber, password);
    setSubmitting(false);
    if (error) setError(error);
    else navigate({ to: "/app/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-white border border-border p-2 shadow-sm">
            <img src={tenantConfig.logo.light} alt={tenantConfig.shortName} className="h-full w-full object-contain" />
          </div>
          <CardTitle className="text-2xl">{tenantConfig.name}</CardTitle>
          <CardDescription>Acceso para personal autorizado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp">Correo o No. de empleado</Label>
              <Input
                id="emp"
                placeholder="admin@correo.com o EO1303"
                value={empNumber}
                onChange={(e) => setEmpNumber(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Contraseña</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Ingresando…" : "Iniciar sesión"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿Necesitas acceso? Contacta al administrador.{" "}
            <Link to="/" className="underline">
              Volver al inicio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
