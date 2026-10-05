import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePatient, useConsultations, usePatientDocuments, usePatientImagings } from "@/hooks/useClinicData";
import { usePatientHospitalizations } from "@/hooks/useHospitalization";
import { useUpdatePatient, useUpdateConsultation, useUploadPatientDocument, useDeletePatientDocument, useCreatePatientImaging, useDeletePatientImaging } from "@/hooks/useClinicMutations";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Plus, Pencil, Phone, Mail, User, Stethoscope,
  Pill, ClipboardList, Share2, Info, ChevronDown, ChevronRight, ChevronLeft,
  Activity, Download, Trash2, Paperclip, AlertCircle, RefreshCw,
  Calendar, Clock, FileText, CheckCircle2, Microscope, BookOpen,
  Image as ImageIcon, Eye, ZoomIn, ZoomOut, Maximize, HeartPulse
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { listEmployees } from "@/lib/employees-api";

export const Route = createFileRoute("/app/pacientes/$id")({
  component: PatientDetailPage,
  head: () => ({ meta: [{ title: `Ficha de Paciente — UniversumK9 Stack` }] }),
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

function PatientDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { employee } = useAuth();
  const { role } = useRole();

  const { data: patient, isLoading: loadingPatient, isError: errorPatient, refetch: refetchPatient } = usePatient(id);
  const { data: consultations = [], isLoading: loadingConsultations, isError: errorConsultations, refetch: refetchConsults } = useConsultations(undefined, id);
  const { data: hospitalizations = [], isLoading: loadingHospitalizations } = usePatientHospitalizations(id);
  const { data: documents = [], isLoading: loadingDocs, refetch: refetchDocs } = usePatientDocuments(id);
  const { data: imagings = [], isLoading: loadingImaging, refetch: refetchImaging } = usePatientImagings(id);
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: () => listEmployees(),
  });

  const { mutate: update, isLoading: updating } = useUpdatePatient();
  const { mutate: updateConsult, isLoading: updatingConsult } = useUpdateConsultation();
  const { mutate: uploadDoc, isLoading: uploadingDoc } = useUploadPatientDocument();
  const { mutate: deleteDoc } = useDeletePatientDocument();
  const { mutate: createImaging, isLoading: creatingImaging } = useCreatePatientImaging();
  const { mutate: deleteImaging } = useDeletePatientImaging();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<PatientFormState | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Active Tab Selector
  const [activeTab, setActiveTab] = useState<"consultas" | "imagen">("consultas");

  // Consultation Edit
  const [editConsultOpen, setEditConsultOpen] = useState(false);
  const [selectedConsultId, setSelectedConsultId] = useState<string | null>(null);
  const [consultForm, setConsultForm] = useState({ anamnesis: "", observations: "", notes: "", diagnosis: "" });

  // Document Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [docDescription, setDocDescription] = useState("");

  // Diagnostic Imaging Upload
  const [imagingOpen, setImagingOpen] = useState(false);
  const [imgTitle, setImgTitle] = useState("");
  const [imgType, setImgType] = useState<"ultrasound" | "xray" | "ct_scan" | "other">("ultrasound");
  const [imgDate, setImgDate] = useState(new Date().toISOString().split("T")[0]);
  const [imgFindings, setImgFindings] = useState("");
  const [imgPerformedBy, setImgPerformedBy] = useState<string>("");
  const [selectedImgFiles, setSelectedImgFiles] = useState<File[]>([]);
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);

  // Lightbox for viewing images
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loadingPatient) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Cargando expediente...</span>
      </div>
    );
  }

  if (errorPatient || !patient) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive/50" />
        <p className="font-semibold text-foreground">No se pudo cargar el expediente del paciente.</p>
        <p className="text-sm text-muted-foreground">El paciente no existe o hay un error de conexión.</p>
        <div className="flex justify-center gap-3 mt-2">
          <Button variant="outline" onClick={() => refetchPatient()} className="gap-2 rounded-xl">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: "/app/pacientes" })} className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </div>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleExpand = (cid: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(cid) ? next.delete(cid) : next.add(cid);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(consultations.map(c => c.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const handleEditConsultClick = (c: any) => {
    setSelectedConsultId(c.id);
    setConsultForm({
      anamnesis: c.anamnesis || "",
      observations: c.observations || "",
      notes: c.notes || "",
      diagnosis: c.diagnosis || "",
    });
    setEditConsultOpen(true);
  };

  const handleSaveConsult = () => {
    if (!selectedConsultId) return;
    if (!consultForm.anamnesis.trim()) return toast.error("La anamnesis es obligatoria.");
    if (!consultForm.diagnosis.trim()) return toast.error("El diagnóstico es obligatorio.");
    updateConsult(
      selectedConsultId,
      {
        anamnesis: consultForm.anamnesis.trim(),
        observations: consultForm.observations.trim(),
        notes: consultForm.notes.trim(),
        diagnosis: consultForm.diagnosis.trim(),
      },
      {
        onSuccess: () => { toast.success("Consulta actualizada."); setEditConsultOpen(false); refetchConsults(); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleEditClick = () => {
    setForm({
      name: patient.name,
      species: patient.species,
      breed: patient.breed || "",
      birth_date: patient.birth_date || "",
      weight_kg: patient.weight_kg ? patient.weight_kg.toString() : "",
      owner_name: patient.owner_name,
      owner_phone: patient.owner_phone || "",
      owner_email: patient.owner_email || "",
      notes: patient.notes || "",
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form) return;
    if (!form.name.trim()) return toast.error("El nombre del paciente es obligatorio.");
    if (!form.owner_name.trim()) return toast.error("El nombre del dueño es obligatorio.");
    update(
      patient.id,
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
      },
      {
        onSuccess: () => { toast.success("Expediente actualizado."); setEditOpen(false); refetchPatient(); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docName) setDocName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadDoc = () => {
    if (!selectedFile) return toast.error("Por favor selecciona un archivo.");
    if (!docName.trim()) return toast.error("Escribe un nombre para el documento.");
    uploadDoc(
      { 
        patient_id: patient.id, 
        name: docName.trim(), 
        file: selectedFile, 
        uploaded_by: employee?.id ?? null,
        document_date: docDate,
        description: docDescription.trim() || null
      },
      {
        onSuccess: () => { 
          toast.success("Documento subido."); 
          setUploadOpen(false); 
          setDocName(""); 
          setSelectedFile(null); 
          setDocDescription("");
          setDocDate(new Date().toISOString().split("T")[0]);
          refetchDocs(); 
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDeleteDoc = (docId: string, url: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    deleteDoc(
      { id: docId, patient_id: patient.id, file_url: url },
      {
        onSuccess: () => { toast.success("Documento eliminado."); refetchDocs(); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleShare = () => {
    const text = `Paciente: ${patient.name} (${patient.species}${patient.breed ? ` - ${patient.breed}` : ""}). Dueño: ${patient.owner_name}, Tel: ${patient.owner_phone || "N/A"}.`;
    navigator.clipboard.writeText(text);
    toast.success("Ficha digital copiada al portapapeles.");
  };

  const handleImgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedImgFiles(prev => [...prev, ...files]);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImgPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeSelectedImgFile = (index: number) => {
    setSelectedImgFiles(prev => prev.filter((_, i) => i !== index));
    if (imgPreviews[index]) {
      URL.revokeObjectURL(imgPreviews[index]);
    }
    setImgPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveImaging = () => {
    if (!imgTitle.trim()) return toast.error("El título del estudio es obligatorio.");
    if (!imgFindings.trim()) return toast.error("El informe de hallazgos es obligatorio.");
    if (selectedImgFiles.length === 0) return toast.error("Por favor selecciona al menos una captura o placa.");

    createImaging(
      {
        patient_id: patient.id,
        study_type: imgType,
        title: imgTitle.trim(),
        date: imgDate,
        findings: imgFindings.trim(),
        files: selectedImgFiles,
        performed_by: imgPerformedBy || null,
      },
      {
        onSuccess: () => {
          toast.success("Estudio de imagen registrado correctamente.");
          setImagingOpen(false);
          setImgTitle("");
          setImgType("ultrasound");
          setImgDate(new Date().toISOString().split("T")[0]);
          setImgFindings("");
          setImgPerformedBy("");
          imgPreviews.forEach(url => URL.revokeObjectURL(url));
          setImgPreviews([]);
          setSelectedImgFiles([]);
          refetchImaging();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDeleteImaging = (studyId: string, urls: string[]) => {
    if (!confirm("¿Eliminar este estudio de imagen y todas sus imágenes?")) return;
    deleteImaging(
      { id: studyId, patient_id: patient.id, image_urls: urls },
      {
        onSuccess: () => {
          toast.success("Estudio de imagen eliminado.");
          refetchImaging();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  const calculateAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return "Edad desconocida";
    try {
      const birth = new Date(birthDateStr);
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      let months = today.getMonth() - birth.getMonth();
      if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) { years--; months += 12; }
      if (years === 0) return months === 0 ? "Menos de un mes" : `${months} ${months === 1 ? "mes" : "meses"}`;
      let s = `${years} ${years === 1 ? "año" : "años"}`;
      if (months > 0) s += ` y ${months} ${months === 1 ? "mes" : "meses"}`;
      return s;
    } catch { return "Edad desconocida"; }
  };

  const canEditConsult = (c: any) => role === "admin" || employee?.id === c.attended_by;

  // ── History Items Merging ──────────────────────────────────────────────────
  type HistoryItem = 
    | { type: 'consultation', date: Date, data: any }
    | { type: 'hospitalization', date: Date, data: any };

  const historyItems: HistoryItem[] = [
    ...consultations.map(c => ({ type: 'consultation' as const, date: new Date(c.date), data: c })),
    ...hospitalizations.map(h => ({ type: 'hospitalization' as const, date: new Date(h.admission_date), data: h }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1060px] space-y-6 pb-16">

      {/* Back */}
      <div>
        <Link to="/app/pacientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver a pacientes
        </Link>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Patient Card */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-inner border border-muted/20 ${speciesColor(patient.species)}`}>
                {speciesIcon(patient.species)}
              </div>
              <h2 className="mt-4 text-2xl font-bold text-foreground tracking-tight">{patient.name}</h2>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                {patient.species}{patient.breed ? ` · ${patient.breed}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Badge variant={patient.is_active ? "outline" : "secondary"} className={patient.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                  {patient.is_active ? "Activo" : "Inactivo"}
                </Badge>
                {patient.weight_kg && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {patient.weight_kg} kg
                  </Badge>
                )}
                <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                  {consultations.length} {consultations.length === 1 ? "visita" : "visitas"}
                </Badge>
              </div>
            </div>

            {/* Details */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Edad</p>
                  <p className="font-medium text-foreground mt-0.5">{calculateAge(patient.birth_date)}</p>
                </div>
                {patient.birth_date && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nacimiento</p>
                    <p className="font-medium text-foreground mt-0.5">{format(new Date(patient.birth_date), "d MMM yyyy", { locale: es })}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Owner */}
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dueño / Responsable</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  {patient.owner_name}
                </div>
                {patient.owner_phone && (
                  <a href={`tel:${patient.owner_phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                    <Phone className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    {patient.owner_phone}
                  </a>
                )}
                {patient.owner_email && (
                  <a href={`mailto:${patient.owner_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                    <Mail className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    {patient.owner_email}
                  </a>
                )}
              </div>
            </div>

            {/* Medical Notes */}
            {patient.notes && (
              <div className="border-t border-border pt-4 space-y-2">
                <span className="text-[11px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Alertas / Antecedentes
                </span>
                <p className="text-xs leading-relaxed text-foreground bg-red-50/60 p-3 rounded-xl border border-red-100">
                  {patient.notes}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            {can("log_consultation") ? (
              <Link
                to="/app/consultas"
                search={{ patientId: patient.id }}
                className="flex w-full items-center justify-between p-4 bg-primary text-primary-foreground rounded-2xl shadow-sm hover:bg-primary/95 transition-all group font-medium"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Registrar nueva visita
                </span>
                <ChevronRight className="h-5 w-5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : can("manage_patients") ? (
              <Link
                to="/app/sala-espera"
                className="flex w-full items-center justify-between p-4 bg-primary text-primary-foreground rounded-2xl shadow-sm hover:bg-primary/95 transition-all group font-medium"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Ingresar a Sala de Espera
                </span>
                <ChevronRight className="h-5 w-5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : null}

            <button
              onClick={handleShare}
              className="flex w-full items-center justify-between p-4 bg-card border border-border text-foreground rounded-2xl shadow-sm hover:bg-muted/40 transition-all group font-medium"
            >
              <span className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-muted-foreground" />
                Compartir cartilla digital
              </span>
              <ChevronRight className="h-5 w-5 opacity-40 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {can("manage_patients") && (
              <button
                onClick={handleEditClick}
                className="flex w-full items-center justify-between p-4 bg-card border border-border text-foreground rounded-2xl shadow-sm hover:bg-muted/40 transition-all group font-medium"
              >
                <span className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-muted-foreground" />
                  Editar expediente
                </span>
                <ChevronRight className="h-5 w-5 opacity-40 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {/* Documents */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-primary" />
                Expedientes Adjuntos
                {documents.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({documents.length})</span>
                )}
              </h4>
              <button
                onClick={() => setUploadOpen(true)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" /> Subir
              </button>
            </div>

            {loadingDocs ? (
              <p className="text-xs text-muted-foreground text-center py-4">Cargando documentos...</p>
            ) : documents.length === 0 ? (
              <div className="py-4 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground italic">No hay documentos cargados.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl border border-border/60 text-xs">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-foreground truncate" title={doc.name}>{doc.name}</span>
                      {doc.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 italic">{doc.description}</p>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(doc.document_date + "T12:00:00"), "d MMM yyyy", { locale: es })}
                        {(doc as any).employee ? ` · ${(doc as any).employee.first_name}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={doc.file_url} target="_blank" rel="noreferrer"
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground" title="Ver/Descargar">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {(role === "admin" || role === "manager" || employee?.id === doc.uploaded_by) && (
                        <button onClick={() => handleDeleteDoc(doc.id, doc.file_url)}
                          className="p-1.5 hover:bg-red-50 rounded-md text-muted-foreground hover:text-destructive" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN — Clinical History ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs Switcher */}
          <div className="flex flex-col gap-4 border-b border-border pb-1">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("consultas")}
                  className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === "consultas"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Bitácora de Consultas
                </button>
                <button
                  onClick={() => setActiveTab("imagen")}
                  className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === "imagen"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  Estudios de Imagen
                  {imagings.length > 0 && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] rounded-full font-bold bg-primary/10 text-primary border-transparent">
                      {imagings.length}
                    </Badge>
                  )}
                </button>
              </div>

              {activeTab === "consultas" && consultations.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={expandAll} className="text-muted-foreground hover:text-foreground font-medium">
                    Expandir todo
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button onClick={collapseAll} className="text-muted-foreground hover:text-foreground font-medium">
                    Colapsar todo
                  </button>
                </div>
              )}

              {activeTab === "imagen" && can("log_consultation") && (
                <Button
                  size="sm"
                  onClick={() => setImagingOpen(true)}
                  className="rounded-xl gap-1.5 h-8 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Registrar Estudio
                </Button>
              )}
            </div>
          </div>

          {activeTab === "consultas" && (
            <>
              {/* Loading Consultations */}
              {loadingConsultations && (
                <div className="py-16 text-center bg-card rounded-2xl border border-border">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Cargando historial clínico...</p>
                </div>
              )}

              {/* Error Consultations */}
              {!loadingConsultations && errorConsultations && (
                <div className="py-12 text-center bg-card rounded-2xl border border-destructive/30 shadow-sm space-y-3">
                  <AlertCircle className="mx-auto h-10 w-10 text-destructive/50" />
                  <p className="text-sm font-semibold text-destructive">Error al cargar el historial clínico.</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Puede ser un problema de conexión o de permisos. Intenta recargar la página.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => refetchConsults()} className="gap-2 rounded-xl">
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </Button>
                </div>
              )}

              {/* Empty Consultations/History */}
              {!loadingConsultations && !errorConsultations && !loadingHospitalizations && historyItems.length === 0 && (
                <div className="py-20 text-center bg-card rounded-2xl border border-border shadow-sm space-y-3">
                  <ClipboardList className="mx-auto h-14 w-14 text-muted-foreground/15 mb-2" />
                  <p className="text-base font-semibold text-muted-foreground">Sin historial registrado</p>
                  <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
                    Aún no hay consultas ni hospitalizaciones en el historial de {patient.name}. Registra la primera visita para comenzar la bitácora.
                  </p>
                  {can("log_consultation") && (
                    <Link to="/app/consultas" search={{ patientId: patient.id }} className="inline-flex mt-2">
                      <Button size="sm" className="rounded-xl gap-1.5">
                        <Plus className="h-4 w-4" /> Registrar primera visita
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Clinical History Timeline */}
              {!loadingConsultations && !errorConsultations && !loadingHospitalizations && historyItems.length > 0 && (
                <div className="relative space-y-4">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-border/60 hidden sm:block" />

                  {historyItems.map(({ type, date, data }, idx) => {
                    const itemDate = new Date(date);
                    const formattedDate = format(itemDate, "d 'de' MMMM 'de' yyyy", { locale: es });
                    const formattedTime = format(itemDate, "h:mm a");
                    const timeAgo = formatDistanceToNow(itemDate, { addSuffix: true, locale: es });

                    if (type === 'consultation') {
                      const c = data;
                      const isExpanded = expandedIds.has(c.id);
                      const canEdit = canEditConsult(c);

                      return (
                        <div key={`consult-${c.id}`} className="relative sm:pl-12">
                        {/* Timeline dot */}
                        <div className="absolute left-3.5 top-5 h-3 w-3 rounded-full border-2 border-primary bg-background hidden sm:block" />

                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200">
                          {/* Header row */}
                          <button
                            onClick={() => toggleExpand(c.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <Stethoscope className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-foreground text-sm">
                                    {(c as any).procedure?.name || "Consulta"}
                                  </h4>
                                  {idx === 0 && (
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] px-2 py-0 rounded-full font-bold">
                                      Más reciente
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <Calendar className="h-3 w-3 inline" />
                                  {formattedDate}
                                  <span className="text-muted-foreground/40">·</span>
                                  <Clock className="h-3 w-3 inline" />
                                  {formattedTime}
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="text-muted-foreground/70">{timeAgo}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {(c as any).employee && (
                                <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted/40 px-2 py-1 rounded-lg">
                                  <User className="h-3 w-3" />
                                  {(c as any).employee.first_name} {(c as any).employee.last_name}
                                </span>
                              )}
                              {canEdit && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditConsultClick(c); }}
                                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                                  title="Editar consulta"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {isExpanded
                                ? <ChevronDown className="h-5 w-5 text-muted-foreground/60" />
                                : <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
                              }
                            </div>
                          </button>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="px-5 pb-6 pt-1 border-t border-border/60 bg-muted/5 space-y-4">

                              {/* Attending doctor */}
                              {(c as any).employee && (
                                <div className="flex items-center gap-2 py-2 border-b border-border/40">
                                  <User className="h-4 w-4 text-muted-foreground/50" />
                                  <span className="text-xs text-muted-foreground">Atendido por:</span>
                                  <span className="text-xs font-bold text-foreground">
                                    {(c as any).employee.first_name} {(c as any).employee.last_name}
                                  </span>
                                  {(c as any).employee.employee_number && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                                      {(c as any).employee.employee_number}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Clinical fields */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

                                {/* Anamnesis */}
                                {c.anamnesis ? (
                                  <div className="md:col-span-2 space-y-1.5">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider">
                                      <BookOpen className="h-3.5 w-3.5" /> Anamnesis
                                    </span>
                                    <p className="text-foreground leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100/80 text-sm">
                                      {c.anamnesis}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                      <BookOpen className="h-3.5 w-3.5" /> Sin anamnesis registrada.
                                    </p>
                                  </div>
                                )}

                                {/* Observaciones */}
                                {c.observations && (
                                  <div className="space-y-1.5">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
                                      <Microscope className="h-3.5 w-3.5" /> Observaciones
                                    </span>
                                    <p className="text-foreground leading-relaxed bg-blue-50/40 p-3 rounded-xl border border-blue-100/80 text-sm">
                                      {c.observations}
                                    </p>
                                  </div>
                                )}

                                {/* Interpretación */}
                                {c.notes && (
                                  <div className="space-y-1.5">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-violet-700 uppercase tracking-wider">
                                      <Activity className="h-3.5 w-3.5" /> Interpretación / Dx Diferenciales
                                    </span>
                                    <p className="text-foreground leading-relaxed bg-violet-50/40 p-3 rounded-xl border border-violet-100/80 text-sm">
                                      {c.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Diagnóstico final */}
                                {c.diagnosis ? (
                                  <div className="md:col-span-2 space-y-1.5">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Diagnóstico Definitivo
                                    </span>
                                    <p className="text-foreground font-semibold bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/80 text-sm">
                                      {c.diagnosis}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Sin diagnóstico definitivo registrado.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Prescriptions */}
                              {c.prescriptions && c.prescriptions.length > 0 && (
                                <div className="border-t border-border/60 pt-4 space-y-2">
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    <Pill className="h-3.5 w-3.5 text-primary" /> Tratamiento / Receta
                                  </span>
                                  <div className="grid sm:grid-cols-2 gap-2">
                                    {c.prescriptions.map((rx: any) => (
                                      <div key={rx.id} className="bg-card p-3 rounded-xl border border-border/80 flex flex-col gap-1 shadow-inner">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-bold text-sm text-foreground truncate">
                                            {rx.item?.name ?? "Medicamento"}
                                          </span>
                                          <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20 rounded-md shrink-0">
                                            ×{rx.quantity}
                                          </Badge>
                                        </div>
                                        {rx.instructions && (
                                          <p className="text-xs text-muted-foreground italic">{rx.instructions}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* No clinical content placeholder */}
                              {!c.anamnesis && !c.observations && !c.notes && !c.diagnosis && (!c.prescriptions || c.prescriptions.length === 0) && (
                                <div className="py-4 text-center">
                                  <p className="text-sm text-muted-foreground italic">Esta visita no tiene detalles clínicos registrados aún.</p>
                                  {canEdit && (
                                    <button
                                      onClick={() => handleEditConsultClick(c)}
                                      className="mt-2 text-xs text-primary font-semibold hover:underline"
                                    >
                                      + Agregar información clínica
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const h = data;
                    const statusColor = h.status === 'admitted' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200';
                    const criticalColor = h.critical_level === 'crítico' ? 'text-red-600' : h.critical_level === 'delicado' ? 'text-yellow-600' : 'text-blue-600';

                    return (
                      <div key={`hosp-${h.id}`} className="relative sm:pl-12">
                        <div className="absolute left-3.5 top-5 h-3 w-3 rounded-full border-2 border-indigo-500 bg-background hidden sm:block" />
                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <HeartPulse className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-foreground text-sm">Hospitalización</h4>
                                  <Badge variant="outline" className={`text-[10px] px-2 py-0 rounded-full font-bold ${statusColor}`}>
                                    {h.status === 'admitted' ? 'Internado Actual' : 'Dado de Alta'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <Calendar className="h-3 w-3 inline" />
                                  {formattedDate} a las {formattedTime}
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className={criticalColor}>Gravedad: {h.critical_level}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1 shrink-0 bg-muted/20 sm:bg-transparent p-2 sm:p-0 rounded-xl">
                              <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                                Motivo: {h.reason}
                              </span>
                              {h.doctor && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <User className="h-3 w-3" />
                                  Por: {h.doctor.first_name} {h.doctor.last_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
                </div>
              )}
            </>
          )}

          {activeTab === "imagen" && (
            <>
              {/* Loading Imagen */}
              {loadingImaging && (
                <div className="py-16 text-center bg-card rounded-2xl border border-border">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Cargando estudios de imagen...</p>
                </div>
              )}

              {/* Empty Imagen */}
              {!loadingImaging && imagings.length === 0 && (
                <div className="py-20 text-center bg-card rounded-2xl border border-border shadow-sm space-y-3">
                  <ImageIcon className="mx-auto h-14 w-14 text-muted-foreground/15 mb-2" />
                  <p className="text-base font-semibold text-muted-foreground">Sin estudios registrados</p>
                  <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
                    No se han registrado estudios de ultrasonido, radiografías o tomografías para {patient.name}.
                  </p>
                  {can("log_consultation") && (
                    <Button
                      size="sm"
                      onClick={() => setImagingOpen(true)}
                      className="rounded-xl gap-1.5 mt-2"
                    >
                      <Plus className="h-4 w-4" /> Registrar primer estudio
                    </Button>
                  )}
                </div>
              )}

              {/* Imaging Studies List */}
              {!loadingImaging && imagings.length > 0 && (
                <div className="space-y-6">
                  {imagings.map((img) => {
                    const imgDateObj = new Date(img.date + "T12:00:00");
                    const formattedImgDate = format(imgDateObj, "d 'de' MMMM 'de' yyyy", { locale: es });
                    
                    let typeLabel = "Otro";
                    let typeIcon = "📁";
                    let typeBadgeColor = "bg-gray-50 text-gray-700 border-gray-200";
                    
                    if (img.study_type === "ultrasound") {
                      typeLabel = "Ultrasonido";
                      typeIcon = "🔊";
                      typeBadgeColor = "bg-sky-50 text-sky-700 border-sky-200";
                    } else if (img.study_type === "xray") {
                      typeLabel = "Radiografía";
                      typeIcon = "🩻";
                      typeBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                    } else if (img.study_type === "ct_scan") {
                      typeLabel = "Tomografía (TC)";
                      typeIcon = "🧠";
                      typeBadgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                    }

                    const canDelete = role === "admin" || role === "manager" || (img.performed_by && employee?.id === img.performed_by);

                    return (
                      <div key={img.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                        {/* Header */}
                        <div className="p-4 border-b border-border/60 bg-muted/10 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`font-bold flex items-center gap-1 text-[11px] rounded-lg px-2 py-0.5 ${typeBadgeColor}`}>
                              <span>{typeIcon}</span> {typeLabel}
                            </Badge>
                            <div>
                              <h4 className="font-bold text-foreground text-sm">{img.title}</h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 inline" />
                                {formattedImgDate}
                                {img.employee && (
                                  <>
                                    <span className="text-muted-foreground/40">·</span>
                                    <User className="h-3 w-3 inline" />
                                    Realizado por: {img.employee.first_name} {img.employee.last_name}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteImaging(img.id, img.image_urls)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                              title="Eliminar estudio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                          {/* Findings */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                              Reporte de Hallazgos
                            </span>
                            <p className="text-foreground leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/40 text-sm whitespace-pre-wrap">
                              {img.findings}
                            </p>
                          </div>

                          {/* Image Grid */}
                          {img.image_urls && img.image_urls.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                Capturas del Estudio ({img.image_urls.length})
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {img.image_urls.map((url, index) => (
                                  <div
                                    key={index}
                                    className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                                    onClick={() => openLightbox(img.image_urls, index)}
                                  >
                                    <img
                                      src={url}
                                      alt={`${img.title} - Captura ${index + 1}`}
                                      className="h-full w-full object-cover transition-all duration-300 group-hover:brightness-90"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white">
                                        <Eye className="h-4 w-4" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Edit Patient Dialog ──────────────────────────────────────────────── */}
      {form && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[560px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Editar Expediente de {patient.name}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2 border-b pb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos del Paciente</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" />
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
                <Input type="number" min={0} step={0.1} value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="rounded-lg" />
              </div>
              <div className="col-span-2 border-b pb-1 mt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos del Dueño</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre del dueño *</Label>
                <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className="rounded-lg" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Correo electrónico</Label>
                <Input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} className="rounded-lg" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notas / Antecedentes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="rounded-lg resize-none" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-lg">Cancelar</Button>
              <Button onClick={handleSave} disabled={updating} className="rounded-lg">{updating ? "Guardando..." : "Guardar Cambios"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit Consultation Dialog ─────────────────────────────────────────── */}
      <Dialog open={editConsultOpen} onOpenChange={setEditConsultOpen}>
        <DialogContent className="sm:max-w-[580px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Editar Registro de Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-amber-700">
                <BookOpen className="h-4 w-4" /> Anamnesis *
              </Label>
              <Textarea rows={3} placeholder="Información provista por el cliente..." value={consultForm.anamnesis}
                onChange={(e) => setConsultForm({ ...consultForm, anamnesis: e.target.value })} className="rounded-lg resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-blue-700">
                <Microscope className="h-4 w-4" /> Observaciones
              </Label>
              <Textarea rows={3} placeholder="Hallazgos físicos, signos vitales..." value={consultForm.observations}
                onChange={(e) => setConsultForm({ ...consultForm, observations: e.target.value })} className="rounded-lg resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-violet-700">
                <Activity className="h-4 w-4" /> Interpretación / Diagnósticos diferenciales y presuntivos
              </Label>
              <Textarea rows={3} placeholder="Interpretación médica y diferenciales..." value={consultForm.notes}
                onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })} className="rounded-lg resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Diagnóstico Definitivo *
              </Label>
              <Textarea rows={3} placeholder="Diagnóstico final..." value={consultForm.diagnosis}
                onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })} className="rounded-lg resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditConsultOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button onClick={handleSaveConsult} disabled={updatingConsult} className="rounded-lg">
              {updatingConsult ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Document Dialog ───────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Adjuntar Expediente / Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre del Documento *</Label>
              <Input placeholder="Ej. Cartilla de vacunación, Radiografía..." value={docName}
                onChange={(e) => setDocName(e.target.value)} className="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha del Documento *</Label>
              <Input type="date" value={docDate}
                onChange={(e) => setDocDate(e.target.value)} className="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción / Notas</Label>
              <Textarea placeholder="Ej. Carnet de vacunas cachorro 2018-2022..." value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)} rows={2} className="rounded-lg resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Archivo *</Label>
              <Input type="file" onChange={handleFileChange} className="rounded-lg cursor-pointer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { 
              setUploadOpen(false); 
              setSelectedFile(null); 
              setDocName(""); 
              setDocDescription("");
              setDocDate(new Date().toISOString().split("T")[0]);
            }} className="rounded-lg">
              Cancelar
            </Button>
            <Button onClick={handleUploadDoc} disabled={uploadingDoc} className="rounded-lg">
              {uploadingDoc ? "Subiendo..." : "Subir Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Registrar Estudio de Imagen Dialog ────────────────────────────────── */}
      <Dialog open={imagingOpen} onOpenChange={setImagingOpen}>
        <DialogContent className="sm:max-w-[580px] rounded-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Registrar Estudio de Imagen Diagnóstica
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de Estudio *</Label>
                <Select
                  value={imgType}
                  onValueChange={(v: any) => setImgType(v)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultrasound">🔊 Ultrasonido</SelectItem>
                    <SelectItem value="xray">🩻 Radiografía (Rayos X)</SelectItem>
                    <SelectItem value="ct_scan">🧠 Tomografía (TC)</SelectItem>
                    <SelectItem value="other">📁 Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha del Estudio *</Label>
                <Input
                  type="date"
                  value={imgDate}
                  onChange={(e) => setImgDate(e.target.value)}
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título del Estudio *</Label>
              <Input
                placeholder="Ej. Ultrasonido Abdominal Hepático, Radiografía Lateral de Tórax..."
                value={imgTitle}
                onChange={(e) => setImgTitle(e.target.value)}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Médico Responsable</Label>
              <Select
                value={imgPerformedBy}
                onValueChange={(v) => setImgPerformedBy(v)}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Selecciona el médico..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reporte de Hallazgos / Diagnóstico de Imagen *</Label>
              <Textarea
                rows={5}
                placeholder="Describe a detalle las observaciones clínicas encontradas en las capturas del estudio de imagen..."
                value={imgFindings}
                onChange={(e) => setImgFindings(e.target.value)}
                className="rounded-lg resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Capturas / Placas del Estudio *</Label>
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 text-center hover:bg-muted/10 transition-colors relative">
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImgFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="space-y-1.5">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs font-semibold text-foreground">
                    Arrastra aquí tus archivos de imagen o haz click para explorar
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Formatos soportados: JPG, PNG, WEBP. Se pueden subir múltiples imágenes.
                  </p>
                </div>
              </div>

              {/* Previews Grid */}
              {imgPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {imgPreviews.map((previewUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                      <img
                        src={previewUrl}
                        alt={`Preview ${index}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedImgFile(index)}
                        className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImagingOpen(false);
                setImgTitle("");
                setImgType("ultrasound");
                setImgDate(new Date().toISOString().split("T")[0]);
                setImgFindings("");
                setImgPerformedBy("");
                imgPreviews.forEach(url => URL.revokeObjectURL(url));
                setImgPreviews([]);
                setSelectedImgFiles([]);
              }}
              className="rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveImaging}
              disabled={creatingImaging}
              className="rounded-lg gap-2"
            >
              {creatingImaging ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Guardando y subiendo...
                </>
              ) : (
                "Registrar Estudio"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox Visor Dialog ─────────────────────────────────────────────── */}
      {/* ── Lightbox Visor (Raw Overlay) ─────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col overflow-hidden">
          
          {/* Top Toolbar */}
          <div className="flex-none h-14 bg-black/60 backdrop-blur-md z-50 flex items-center justify-between px-4 border-b border-white/10">
            <div className="text-white text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Visor de Estudios de Imagen
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setLightboxZoom(z => Math.max(0.2, z - 0.2))} className="p-2 text-white/80 hover:text-white bg-white/10 rounded-lg transition-colors"><ZoomOut className="w-4 h-4"/></button>
              <span className="text-white text-xs w-12 text-center font-mono">{Math.round(lightboxZoom * 100)}%</span>
              <button onClick={() => setLightboxZoom(z => Math.min(5, z + 0.2))} className="p-2 text-white/80 hover:text-white bg-white/10 rounded-lg transition-colors"><ZoomIn className="w-4 h-4"/></button>
              <button onClick={() => setLightboxZoom(1)} className="p-2 text-white/80 hover:text-white bg-white/10 rounded-lg ml-2 transition-colors"><Maximize className="w-4 h-4"/></button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <button onClick={() => { setLightboxOpen(false); setLightboxZoom(1); }} className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                Cerrar
              </button>
            </div>
          </div>

          {lightboxImages.length > 0 && (
            <div className="flex-1 w-full h-full overflow-auto relative flex">
              {/* Image Container */}
              <div className="m-auto flex items-center justify-center min-h-full min-w-full p-4 md:p-16">
                <div 
                  style={{ 
                    transform: `scale(${lightboxZoom})`, 
                    transformOrigin: 'center center', 
                    transition: 'transform 0.15s ease-out' 
                  }}
                >
                  <img
                    src={lightboxImages[lightboxIndex]}
                    alt={`Ampliación ${lightboxIndex + 1}`}
                    className="max-w-none shadow-2xl"
                    style={{ 
                      maxHeight: lightboxZoom <= 1 ? 'calc(100vh - 8rem)' : 'none', 
                      maxWidth: lightboxZoom <= 1 ? '100%' : 'none' 
                    }}
                  />
                </div>
              </div>

              {/* Navigation Arrows (Fixed to screen edges) */}
              {lightboxImages.length > 1 && (
                <>
                  <button
                    onClick={() => { setLightboxIndex(prev => (prev === 0 ? lightboxImages.length - 1 : prev - 1)); setLightboxZoom(1); }}
                    className="fixed left-4 top-1/2 -translate-y-1/2 h-14 w-14 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all border border-white/10 z-40"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                  <button
                    onClick={() => { setLightboxIndex(prev => (prev === lightboxImages.length - 1 ? 0 : prev + 1)); setLightboxZoom(1); }}
                    className="fixed right-4 top-1/2 -translate-y-1/2 h-14 w-14 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all border border-white/10 z-40"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </>
              )}

              {/* Bottom Caption and action bar */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/80 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-sm z-50">
                <span className="font-medium">
                  Captura {lightboxIndex + 1} de {lightboxImages.length}
                </span>
                <div className="w-px h-4 bg-white/20" />
                <a
                  href={lightboxImages[lightboxIndex]}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center gap-1.5 hover:text-white font-semibold transition-all"
                >
                  <Download className="h-4 w-4" /> Descargar
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
