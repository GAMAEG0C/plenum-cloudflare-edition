import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useState, useEffect } from "react";
import {
  Package,
  BarChart3,
  Bell,
  Truck,
  ScanLine,
  TrendingUp,
  Users,
  ArrowRight,
  Shield,
  Globe,
  Zap,
  Menu,
  X,
  HeartPulse,
  Stethoscope,
  Activity,
  Video,
  FileSpreadsheet,
  Star,
  MapPin,
  Sparkles,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import vetHero from "@/assets/vet-hero.png";
import realFacility1 from "@/assets/real-facility-1.jpg";
import realFacility2 from "@/assets/real-facility-2.jpg";
import dashboardPreview from "@/assets/dashboard-preview.png";
import { tenantConfig } from "@/config/tenant";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "{tenantConfig.name} — Plataforma Veterinaria Integral y Gestión de Inventario" },
      {
        name: "description",
        content:
          "Expediente clínico SOAP, recetas digitales, control de lotes PEPS y punto de venta para clínicas veterinarias modernas.",
      },
      { property: "og:title", content: "{tenantConfig.name} — Plataforma Veterinaria Integral" },
      {
        property: "og:description",
        content:
          "Expediente clínico SOAP, recetas digitales, control de lotes PEPS y punto de venta para clínicas veterinarias modernas.",
      },
    ],
  }),
});

/* ─── Data ──────────────────────────────────────────── */
const navLinks = [
  { label: "Inicio", href: "#home" },
  { label: "Servicios", href: "#services" },
  { label: "Instalaciones", href: "#facilities" },
];

const clinicalServices = [
  {
    icon: Stethoscope,
    title: "ATENCIÓN ESPECIALIZADA",
    description: "Consulta general, diagnóstico rápido, medicina preventiva y neonatología de primer nivel.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Activity,
    title: "DIAGNÓSTICOS AVANZADOS",
    description: "Mapeo completo de laboratorio, ecografías y rayos X integrados al expediente clínico.",
    color: "bg-amber-accent/10 text-amber-accent",
  },
  {
    icon: Video,
    title: "TELEMEDICINA VETERINARIA",
    description: "Consultas virtuales sincrónicas y seguimiento remoto para comodidad de dueños y mascotas.",
    color: "bg-stock-healthy/10 text-stock-healthy",
  },
  {
    icon: FileSpreadsheet,
    title: "GESTIÓN CLÍNICA E INVENTARIO",
    description: "Expediente digital SOAP, recetas automáticas y control de lotes de medicamentos PEPS.",
    color: "bg-primary/15 text-primary",
  },
];

/* ─── Components ────────────────────────────────────── */

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = (href: string) => {
    setMobileOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 border-b border-border shadow-sm backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-border p-1 shadow-sm transition-transform group-hover:scale-105 shrink-0">
            <img src={tenantConfig.logo.light} alt={tenantConfig.shortName} className="h-full w-auto object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {tenantConfig.name}
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(l.href);
              }}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
          >
            Ingresar
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-105"
          >
            Iniciar sesión
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur-md px-4 py-4 md:hidden shadow-lg animate-fade-in">
          <div className="flex flex-col gap-2">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(l.href);
                }}
                className="block py-2.5 px-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <hr className="my-2 border-border" />
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full py-2.5 text-center text-base font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Ingresar
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full rounded-full bg-primary py-2.5 text-center text-base font-semibold text-primary-foreground shadow-md hover:brightness-105 transition-all"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function BrowserFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card shadow-2xl ${className}`}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="h-3 w-3 rounded-full bg-red-500/70" />
        <div className="h-3 w-3 rounded-full bg-amber-500/70" />
        <div className="h-3 w-3 rounded-full bg-green-500/70" />
        <div className="mx-auto max-w-xs w-full bg-muted border border-border rounded-md py-0.5 px-3 text-[10px] text-center text-muted-foreground truncate">
          admin.universumk9.stack/app
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────── */
function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20" id="home">
      <StickyNav />

      {/* ── Hero Section ── */}
      <section className="relative px-4 pt-28 pb-16 sm:px-6 lg:px-8 max-w-6xl mx-auto overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-20 right-10 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl opacity-60" />
        <div className="absolute bottom-20 left-10 -z-10 h-72 w-72 rounded-full bg-amber-accent/10 blur-3xl opacity-40" />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary animate-fade-in">
              <Sparkles className="h-3 w-3" /> Cuidado Animal con Tecnología
            </span>

            <h1 className="text-3xl font-bold leading-none tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              Clinivet Pro <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">
                Plataforma Clínica Veterinaria Integral
              </span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Avanzando el cuidado animal con tecnología de vanguardia y compasión experta.
              Expedientes médicos SOAP, recetas automáticas, inventario de lotes PEPS y punto de venta desde un solo centro de control en la nube.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:brightness-105 active:scale-98 transition-all"
              >
                Comenzar ahora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#services"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/65 backdrop-blur-xs px-6 py-3 text-base font-semibold text-foreground hover:bg-muted/50 active:scale-98 transition-all"
              >
                Conocer más
              </a>
            </div>

            {/* Quick stats / Features badges */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-border/80 w-full">
              <div>
                <p className="text-2xl font-bold text-foreground sm:text-3xl">100%</p>
                <p className="text-xs text-muted-foreground mt-0.5">En la Nube</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground sm:text-3xl">PEPS</p>
                <p className="text-xs text-muted-foreground mt-0.5">Lotes y Caducidades</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground sm:text-3xl">SOAP</p>
                <p className="text-xs text-muted-foreground mt-0.5">Expediente Clínico</p>
              </div>
            </div>
          </div>

          {/* Right Image/Illustration Column */}
          <div className="lg:col-span-5 relative w-full flex justify-center">
            <div className="relative max-w-sm sm:max-w-md w-full animate-fade-in" style={{ animationDelay: "200ms" }}>
              {/* Backing decorative cards style shadow */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary to-amber-accent opacity-20 blur-xl -z-10" />

              <img
                src={vetHero}
                alt="Profesional veterinaria examinando mascota en clínica"
                className="w-full h-auto rounded-3xl border border-border shadow-2xl object-cover"
              />

              {/* Floating Medical Badges */}
              <div className="absolute -top-4 -left-4 bg-background/90 backdrop-blur-xs border border-border p-3 rounded-xl shadow-lg flex items-center gap-3 max-w-[190px] animate-pulse-subtle">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <ClipboardCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-none">Expediente SOAP</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">100% digitalizado</p>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 bg-background/90 backdrop-blur-xs border border-border p-3 rounded-xl shadow-lg flex items-center gap-3 max-w-[190px] animate-pulse-subtle" style={{ animationDelay: "1s" }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-accent/10 text-amber-accent shrink-0">
                  <ScanLine className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-none">Control de Lotes</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Recetas e inventario</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section id="services" className="px-4 py-20 bg-muted/40 border-y border-border/80">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center space-y-4">
            <span className="inline-block rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              Nuestros Módulos
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Historias de Éxito en la Gestión Veterinaria
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed">
              Módulos premium diseñados en conjunto para darte control de consultorio, recetas, arqueos y existencias farmacéuticas.
            </p>
          </RevealSection>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {clinicalServices.map((s, i) => (
              <RevealSection key={s.title} delay={i * 100} className="h-full">
                <div className="group h-full flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20">
                  <div className="space-y-4">
                    <div className={`inline-flex rounded-xl p-3.5 ${s.color}`}>
                      <s.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold tracking-wider text-foreground leading-tight">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  </div>
                  <div className="pt-6">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors"
                    >
                      CONOCER MÁS <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── UI Showcase Section ── */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          <RevealSection className="lg:col-span-5 space-y-5 text-center lg:text-left">
            <span className="inline-block rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              Diseño de Interfaz
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Una plataforma veloz que a tu equipo le encantará usar
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Desarrollada bajo estándares modernos, reduce clics innecesarios y ofrece búsquedas ultra rápidas de productos, expedientes e historiales.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Optimizado para computadoras de escritorio, tabletas y teléfonos inteligentes para un acceso fluido en cualquier lugar del hospital.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
              >
                Explorar demostración técnica <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </RevealSection>

          <RevealSection className="lg:col-span-7">
            <BrowserFrame>
              <img
                src={dashboardPreview}
                alt="Panel de administración e inventario {tenantConfig.shortName}"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </BrowserFrame>
          </RevealSection>
        </div>
      </section>

      {/* ── Facilities Gallery ── */}
      <section id="facilities" className="px-4 py-20 bg-muted/40 border-y border-border/80">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center space-y-4">
            <span className="inline-block rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              Infraestructura
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Nuestras Instalaciones Médicas
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed">
              Equipamiento avanzado y consultorios diseñados para ofrecer tranquilidad y precisión en cada consulta.
            </p>
          </RevealSection>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
            <RevealSection className="group space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border shadow-md">
                <img
                  src={realFacility1}
                  alt="Fachada e Ingreso Principal {tenantConfig.shortName}"
                  className="w-full h-72 sm:h-80 object-cover transition-transform duration-500 group-hover:scale-103"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Fachada e Ingreso Principal</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Instalaciones de primer nivel diseñadas especialmente para la seguridad y el bienestar de tus mascotas.
                </p>
              </div>
            </RevealSection>

            <RevealSection className="group space-y-4" delay={150}>
              <div className="overflow-hidden rounded-2xl border border-border shadow-md">
                <img
                  src={realFacility2}
                  alt="Área de Hospitalización y Recuperación {tenantConfig.shortName}"
                  className="w-full h-72 sm:h-80 object-cover transition-transform duration-500 group-hover:scale-103"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Área de Hospitalización y Cuidado Crítico</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Camas y jaulas de acero inoxidable equipadas y monitoreadas para cuidados intensivos y recuperación post-quirúrgica.
                </p>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-6 py-16 text-center shadow-xl sm:px-12 sm:py-20">
          {/* Decorative glows inside card */}
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-2xl opacity-60" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-amber-accent/10 blur-2xl opacity-40" />

          <RevealSection className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              ¿Listo para modernizar la gestión de tu clínica?
            </h2>
            <p className="text-primary-foreground/80 text-sm sm:text-base leading-relaxed">
              Únete a las clínicas que ya han digitalizado sus consultas y optimizado el control de medicamentos en tiempo real con {tenantConfig.name}.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-base font-semibold text-primary shadow-md hover:bg-muted hover:shadow-lg transition-all active:scale-98"
              >
                Ingresar al sistema
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-4 py-12 text-center bg-muted/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-border p-1 shadow-sm shrink-0">
              <img src={tenantConfig.logo.light} alt={tenantConfig.shortName} className="h-full w-auto object-contain" />
            </div>
            <span className="text-sm font-bold text-foreground">{tenantConfig.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {tenantConfig.shortName}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
