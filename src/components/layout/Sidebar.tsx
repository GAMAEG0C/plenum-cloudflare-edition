import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Truck,
  ClipboardList,
  Inbox,
  MapPin,
  BarChart3,
  Settings,
  ChevronRight,
  HelpCircle,
  PawPrint,
  Stethoscope,
  DollarSign,
  Users,
  Clock,
  ShoppingBag,
  CalendarDays,
  Wallet,
  Banknote,
  Monitor,
  HeartPulse,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import type { RolePermissions } from "@/lib/roles";
import { tenantConfig } from "@/config/tenant";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permKey?: keyof RolePermissions;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permKey?: keyof RolePermissions;
}

const navGroups: NavGroup[] = [
  {
    label: "Operaciones",
    items: [
      { label: "Panel General", href: "/app/dashboard", icon: LayoutDashboard },
      { label: "Catálogo", href: "/app/catalog", icon: Package },
      { label: "Punto de Venta", href: "/app/ventas", icon: ShoppingBag, permKey: "canAccessPOS" },
      { label: "Cuentas", href: "/app/cuentas", icon: DollarSign, permKey: "canAccessPOS" },
      { label: "Movimientos", href: "/app/movements", icon: ArrowLeftRight, permKey: "canViewMovementsHistory" },
      { label: "Ubicaciones", href: "/app/locations", icon: MapPin, permKey: "canManageItems" },
    ],
  },
  {
    label: "Clínica",
    items: [
      { label: "Agenda", href: "/app/agenda", icon: CalendarDays, permKey: "canManagePatients" },
      { label: "Sala de Espera", href: "/app/sala-espera", icon: Clock, permKey: "canManagePatients" },
      { label: "Pacientes", href: "/app/pacientes", icon: PawPrint, permKey: "canManagePatients" },
      { label: "Hospitalización", href: "/app/hospitalizacion", icon: HeartPulse, permKey: "canManageHospitalization" },
      { label: "Consultas", href: "/app/consultas", icon: Stethoscope, permKey: "canManagePatients" },
    ],
  },
  {
    label: "Compras",
    permKey: "canManagePOs",
    items: [
      { label: "Proveedores", href: "/app/suppliers", icon: Truck },
      { label: "Órdenes de Compra", href: "/app/purchase-orders", icon: ClipboardList },
    ],
  },
  {
    label: "Inteligencia",
    permKey: "canViewAnalytics",
    items: [
      { label: "Estadísticas", href: "/app/analytics", icon: BarChart3 },
      { label: "Finanzas (ERP)", href: "/app/finanzas", icon: Wallet, permKey: "canViewAnalytics" },
      { label: "Comisiones", href: "/app/comisiones", icon: DollarSign, permKey: "canViewCommissions" },
    ],
  },
  {
    label: "Administración",
    permKey: "canManageUsers",
    items: [
      { label: "Empleados", href: "/app/empleados", icon: Users },
      { label: "Nómina", href: "/app/nomina", icon: Banknote },
      { label: "Activos Fijos", href: "/app/activos", icon: Monitor },
      { label: "Ajustes", href: "/app/settings", icon: Settings },
    ],
  },
];

const standaloneLinks: NavItem[] = [
  { label: "Checador", href: "/app/checador", icon: Clock },
  { label: "Salida Rápida", href: "/app/salidas", icon: Inbox },
  { label: "Ayuda", href: "/app/help", icon: HelpCircle },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { permissions } = useRole();

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location.pathname === href;

  const visibleGroups = navGroups
    .filter((g) => !g.permKey || permissions[g.permKey])
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.permKey || permissions[i.permKey]),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav data-tour="sidebar" className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center gap-3 px-5 py-3 border-b border-sidebar-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white p-1 shadow-sm shrink-0">
          <img src={tenantConfig.logo.sidebar} alt={tenantConfig.shortName} className="h-full w-auto object-contain" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide text-sidebar-primary-foreground">{tenantConfig.shortName}</span>
          <span className="text-[10px] uppercase tracking-widest text-sidebar-primary">Sistema</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {visibleGroups.map((group, idx) => {
          const isCollapsed = collapsed[group.label] ?? false;
          return (
            <div key={group.label}>
              {idx > 0 && <div className="mx-2 my-2 border-t border-sidebar-border" />}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
              >
                <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", !isCollapsed && "rotate-90")} />
                {group.label}
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-sidebar-accent font-medium text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="mx-2 my-2 border-t border-sidebar-border" />
        <div className="space-y-0.5">
          {standaloneLinks.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent font-medium text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
