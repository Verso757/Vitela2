import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  DollarSign, 
  UserPlus, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  Copy, 
  Check, 
  MessageSquare, 
  Sparkles, 
  MoreVertical, 
  Phone, 
  Mail, 
  Clock, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Stethoscope, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  TrendingUp,
  Inbox,
  Award
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth, SUPER_ADMIN_EMAILS } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  writeBatch
} from "firebase/firestore";

interface ClinicItem {
  id: string;
  name: string;
  doctorName?: string;
  contactEmail: string;
  doctorPhone?: string;
  specialty?: string;
  plan?: "Básico" | "Pro" | "Enterprise" | string;
  planStatus?: "active" | "trial" | "overdue" | "suspended" | string;
  planRenewsAt?: string;
  notes?: string;
  createdAt?: string;
  ownerId?: string;
  patientsCount?: number;
}

interface DemoRequest {
  id: string;
  name?: string;
  doctorName?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  message?: string;
  status?: string;
  createdAt?: any;
}

export default function AdminMaster() {
  const { user, isSuperAdmin, switchClinic, activeClinicId, resetToMyClinic } = useAuth();
  const navigate = useNavigate();

  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicItem | null>(null);
  const [copiedWelcome, setCopiedWelcome] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Clinic Form
  const [newClinic, setNewClinic] = useState({
    name: "",
    doctorName: "",
    contactEmail: "",
    doctorPhone: "",
    specialty: "Medicina General",
    plan: "Pro",
    planStatus: "trial",
    planRenewsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    seedDemoData: true,
  });

  // Edit Clinic Form
  const [editClinicData, setEditClinicData] = useState({
    name: "",
    doctorName: "",
    contactEmail: "",
    doctorPhone: "",
    specialty: "",
    plan: "Pro",
    planStatus: "active",
    planRenewsAt: "",
    notes: "",
  });

  // Load clinics & leads
  useEffect(() => {
    if (!isSuperAdmin) return;

    setLoading(true);
    const clinicsRef = collection(db, "clinics");
    
    const unsubscribeClinics = onSnapshot(clinicsRef, async (snapshot) => {
      const items: ClinicItem[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as ClinicItem);
      });

      // Sort by creation date descending
      items.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dbTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dbTime - da;
      });

      setClinics(items);
      setLoading(false);
    }, (error) => {
      console.error("Error loading clinics:", error);
      toast.error("Error al sincronizar lista de clínicas.");
      setLoading(false);
    });

    // Load demo requests
    const demoReqQuery = query(collection(db, "demo_requests"));
    const unsubscribeDemo = onSnapshot(demoReqQuery, (snapshot) => {
      const reqs: DemoRequest[] = [];
      snapshot.forEach((d) => {
        reqs.push({ id: d.id, ...d.data() });
      });
      setDemoRequests(reqs);
    }, (err) => {
      console.warn("Could not load demo requests:", err);
    });

    return () => {
      unsubscribeClinics();
      unsubscribeDemo();
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-slate-600 mb-6">
          Esta vista es exclusiva para los Super Administradores de Vitela ({SUPER_ADMIN_EMAILS.join(", ")}).
        </p>
        <Button onClick={() => navigate("/dashboard")} className="bg-blue-600 hover:bg-blue-700 text-white">
          Ir a mi Consultorio
        </Button>
      </div>
    );
  }

  // Filtered Clinics
  const filteredClinics = clinics.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (c.name || "").toLowerCase().includes(q) ||
      (c.doctorName || "").toLowerCase().includes(q) ||
      (c.contactEmail || "").toLowerCase().includes(q) ||
      (c.specialty || "").toLowerCase().includes(q) ||
      (c.doctorPhone || "").toLowerCase().includes(q);

    const matchesPlan = filterPlan === "all" || (c.plan || "Pro").toLowerCase() === filterPlan.toLowerCase();
    const matchesStatus = filterStatus === "all" || (c.planStatus || "active").toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Calculate SaaS KPIs
  const totalClinics = clinics.length;
  const activeCount = clinics.filter((c) => c.planStatus === "active").length;
  const trialCount = clinics.filter((c) => c.planStatus === "trial" || !c.planStatus).length;
  
  // Approximate MRR
  const mrr = clinics.reduce((acc, c) => {
    if (c.planStatus !== "active") return acc;
    if (c.plan === "Básico") return acc + 599;
    if (c.plan === "Enterprise") return acc + 2499;
    return acc + 1199; // Pro by default
  }, 0);

  // Handle Create Clinic
  const handleCreateClinic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newClinic.name.trim() || !newClinic.contactEmail.trim()) {
      toast.error("El nombre de la clínica y correo del doctor son obligatorios.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Generate clean ID from clinic name + random suffix
      const slug = newClinic.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20);
      const clinicId = `cli-${slug}-${Date.now().toString(36)}`;

      const batch = writeBatch(db);
      const clinicDocRef = doc(db, "clinics", clinicId);

      const clinicPayload: ClinicItem = {
        id: clinicId,
        name: newClinic.name.trim(),
        doctorName: newClinic.doctorName.trim() || "Doctor Titular",
        contactEmail: newClinic.contactEmail.trim().toLowerCase(),
        doctorPhone: newClinic.doctorPhone.trim(),
        specialty: newClinic.specialty.trim() || "Medicina General",
        plan: newClinic.plan,
        planStatus: newClinic.planStatus,
        planRenewsAt: newClinic.planRenewsAt,
        notes: newClinic.notes.trim(),
        ownerId: clinicId,
        createdAt: new Date().toISOString()
      };

      batch.set(clinicDocRef, clinicPayload);

      // Add owner member placeholder
      const memberRef = doc(db, "clinics", clinicId, "members", clinicId);
      batch.set(memberRef, {
        role: "owner",
        email: newClinic.contactEmail.trim().toLowerCase(),
        name: newClinic.doctorName.trim() || newClinic.name.trim()
      });

      // If seed demo data requested, add 3 sample patients
      if (newClinic.seedDemoData) {
        const p1Ref = doc(db, "clinics", clinicId, "patients", `pt-${Date.now()}-1`);
        batch.set(p1Ref, {
          name: "Mariana Morales Rivas",
          edad: 34,
          sexo: "Femenino",
          tel: "+52 55 9876 5432",
          sangre: "O+",
          peso: "62 kg",
          altura: "1.65 m",
          presion: "118/75"
        });

        const p2Ref = doc(db, "clinics", clinicId, "patients", `pt-${Date.now()}-2`);
        batch.set(p2Ref, {
          name: "Carlos Eduardo Mendoza",
          edad: 48,
          sexo: "Masculino",
          tel: "+52 55 1234 9876",
          sangre: "A+",
          peso: "78 kg",
          altura: "1.74 m",
          presion: "125/82"
        });

        const p3Ref = doc(db, "clinics", clinicId, "patients", `pt-${Date.now()}-3`);
        batch.set(p3Ref, {
          name: "Sofía Valentina Castro",
          edad: 26,
          sexo: "Femenino",
          tel: "+52 55 4567 1234",
          sangre: "B+",
          peso: "56 kg",
          altura: "1.60 m",
          presion: "110/70"
        });
      }

      await batch.commit();

      toast.success("¡Clínica y credenciales creadas con éxito!");
      setCreateModalOpen(false);

      // Open welcome modal immediately for this clinic
      setSelectedClinic(clinicPayload);
      setWelcomeModalOpen(true);

      // Reset form
      setNewClinic({
        name: "",
        doctorName: "",
        contactEmail: "",
        doctorPhone: "",
        specialty: "Medicina General",
        plan: "Pro",
        planStatus: "trial",
        planRenewsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "",
        seedDemoData: true,
      });

    } catch (error: any) {
      console.error("Error creating clinic:", error);
      toast.error(`Error al crear la clínica: ${error?.message || "Intente nuevamente"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Clinic
  const handleSaveEditClinic = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;

    try {
      setIsSubmitting(true);
      const clinicRef = doc(db, "clinics", selectedClinic.id);
      await updateDoc(clinicRef, {
        name: editClinicData.name.trim(),
        doctorName: editClinicData.doctorName.trim(),
        contactEmail: editClinicData.contactEmail.trim().toLowerCase(),
        doctorPhone: editClinicData.doctorPhone.trim(),
        specialty: editClinicData.specialty.trim(),
        plan: editClinicData.plan,
        planStatus: editClinicData.planStatus,
        planRenewsAt: editClinicData.planRenewsAt,
        notes: editClinicData.notes.trim()
      });

      toast.success("Clínica actualizada correctamente");
      setEditModalOpen(false);
    } catch (error: any) {
      console.error("Error updating clinic:", error);
      toast.error("Error al actualizar la clínica");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Clinic
  const handleDeleteClinic = async (clinic: ClinicItem) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente la clínica "${clinic.name}"? Esta acción borrará su acceso.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "clinics", clinic.id));
      toast.success(`Clínica "${clinic.name}" eliminada.`);
      if (activeClinicId === clinic.id) {
        resetToMyClinic();
      }
    } catch (error) {
      console.error("Error deleting clinic:", error);
      toast.error("No se pudo eliminar la clínica.");
    }
  };

  // Handle Switch / Impersonate Clinic
  const handleEnterClinic = (clinic: ClinicItem) => {
    switchClinic(clinic.id, clinic.name);
    toast.success(`Entrando como soporte a "${clinic.name}"...`);
    navigate("/dashboard");
  };

  // Open Edit Modal
  const openEditModal = (clinic: ClinicItem) => {
    setSelectedClinic(clinic);
    setEditClinicData({
      name: clinic.name || "",
      doctorName: clinic.doctorName || "",
      contactEmail: clinic.contactEmail || "",
      doctorPhone: clinic.doctorPhone || "",
      specialty: clinic.specialty || "Medicina General",
      plan: clinic.plan || "Pro",
      planStatus: clinic.planStatus || "active",
      planRenewsAt: clinic.planRenewsAt || "",
      notes: clinic.notes || "",
    });
    setEditModalOpen(true);
  };

  // Convert Lead to Clinic
  const handleConvertLead = (lead: DemoRequest) => {
    setNewClinic({
      name: `Clínica ${lead.name || lead.doctorName || "Médica"}`,
      doctorName: lead.name || lead.doctorName || "",
      contactEmail: lead.email || "",
      doctorPhone: lead.phone || "",
      specialty: lead.specialty || "Medicina General",
      plan: "Pro",
      planStatus: "trial",
      planRenewsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: `Convertido de solicitud demo. Mensaje: ${lead.message || "Sin notas"}`,
      seedDemoData: true,
    });
    setCreateModalOpen(true);
  };

  // Welcome message template
  const getWelcomeText = (clinic: ClinicItem) => {
    const origin = window.location.origin;
    return `🩺 *¡Bienvenido a Vitela!*
Estimado(a) *${clinic.doctorName || "Doctor(a)"}*, su plataforma médica y expediente clínico ya se encuentra activo y listo para usarse:

🌐 *Acceso a su Consultorio*: ${origin}/login
📧 *Correo de Acceso*: ${clinic.contactEmail}
🏥 *Consultorio*: ${clinic.name}
⭐ *Especialidad*: ${clinic.specialty || "Medicina General"}
🏷️ *Plan Asignado*: ${clinic.plan || "Pro"} (${clinic.planStatus === "trial" ? "Prueba de cortesía 14 días" : "Activo"})

📌 *Instrucciones para iniciar*:
1. Abra el enlace: ${origin}/login
2. Presione el botón *"Continuar con Google"* usando su correo autorizado: ${clinic.contactEmail}
3. ¡Listo! Su consultorio ya cuenta con su catálogo configurado y expediente listo.

Cualquier duda durante su configuración o uso de recetas, estamos a sus órdenes para apoyarle.`;
  };

  const copyWelcomeToClipboard = (clinic: ClinicItem) => {
    const text = getWelcomeText(clinic);
    navigator.clipboard.writeText(text);
    setCopiedWelcome(true);
    toast.success("¡Ficha de bienvenida copiada al portapapeles!");
    setTimeout(() => setCopiedWelcome(false), 2500);
  };

  const openWhatsAppDirect = (clinic: ClinicItem) => {
    const cleanPhone = (clinic.doctorPhone || "").replace(/[^0-9]/g, "");
    const text = encodeURIComponent(getWelcomeText(clinic));
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Super Administrador SaaS
            </span>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              ● Firestore Conectado
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Panel Maestro Vitela
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestión centralizada de clínicas clientes, alta de doctores, suscripciones y soporte técnico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeClinicId && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetToMyClinic}
              className="text-xs bg-white text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Restablecer a mi Consultorio
            </Button>
          )}

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            + Alta de Doctor & Clínica
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Clínicas Clientes
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-slate-900">{totalClinics}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-medium">{activeCount} activas</span>
              <span>•</span>
              <span className="text-amber-600 font-medium">{trialCount} en prueba</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Doctores Titulares
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-slate-900">{totalClinics}</div>
            <p className="text-xs text-slate-500 mt-1">
              Cuentas con acceso a expediente
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              MRR Estimado (SaaS)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-slate-900">
              ${mrr.toLocaleString()} <span className="text-xs font-normal text-slate-500">MXN/mes</span>
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Basado en suscripciones activas
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Solicitudes / Leads
            </CardTitle>
            <Inbox className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-slate-900">{demoRequests.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Prospectos recibidos desde la Landing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clinics" className="w-full space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="clinics" className="gap-2 text-xs sm:text-sm">
            <Building2 className="h-4 w-4" />
            Clínicas & Clientes ({filteredClinics.length})
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2 text-xs sm:text-sm">
            <Inbox className="h-4 w-4" />
            Solicitudes de Demo ({demoRequests.length})
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2 text-xs sm:text-sm">
            <Award className="h-4 w-4" />
            Equipo SuperAdmin
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Clinics List */}
        <TabsContent value="clinics" className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por clínica, doctor, correo, especialidad o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="all">Todos los Planes</option>
                <option value="básico">Plan Básico ($599)</option>
                <option value="pro">Plan Pro ($1,199)</option>
                <option value="enterprise">Plan Enterprise ($2,499)</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activas</option>
                <option value="trial">En Prueba (14d)</option>
                <option value="overdue">Vencidas</option>
                <option value="suspended">Suspendidas</option>
              </select>
            </div>
          </div>

          {/* Clinics Grid */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Cargando clínicas registradas...</p>
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-1">No se encontraron clínicas</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                {searchTerm ? "No hay clínicas que coincidan con la búsqueda." : "Aún no has registrado a ningún doctor o clínica cliente."}
              </p>
              <Button onClick={() => setCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Registrar Primer Doctor
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClinics.map((clinic) => {
                const isCurrentlyActive = activeClinicId === clinic.id;
                const status = clinic.planStatus || "active";
                const planName = clinic.plan || "Pro";

                return (
                  <Card 
                    key={clinic.id} 
                    className={`border transition-all duration-200 hover:shadow-md bg-white flex flex-col justify-between ${
                      isCurrentlyActive ? "border-amber-400 ring-2 ring-amber-300 bg-amber-50/20" : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-200 shrink-0">
                              {(clinic.name || "CL").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base font-bold text-slate-900 truncate">
                                {clinic.name}
                              </CardTitle>
                              <CardDescription className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Stethoscope className="h-3 w-3 text-slate-400" />
                                {clinic.specialty || "Medicina General"}
                              </CardDescription>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border ${
                                status === "active" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : status === "trial"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {status === "active" ? "Activo" : status === "trial" ? "Prueba 14d" : "Vencido"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Card Body */}
                      <CardContent className="p-4 pt-0 space-y-2.5 text-xs text-slate-600">
                        {/* Doctor Contact */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-blue-600" />
                            {clinic.doctorName || "Doctor Titular"}
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-slate-500 truncate">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{clinic.contactEmail}</span>
                          </div>

                          {clinic.doctorPhone && (
                            <div className="flex items-center justify-between text-slate-500 pt-0.5">
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{clinic.doctorPhone}</span>
                              </div>
                              <button
                                onClick={() => openWhatsAppDirect(clinic)}
                                className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5 text-[11px]"
                              >
                                <MessageSquare className="h-3 w-3" /> WhatsApp
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Plan & Renewal */}
                        <div className="flex items-center justify-between text-slate-500 text-[11px] px-1">
                          <span>Plan: <strong className="text-slate-800">{planName}</strong></span>
                          {clinic.planRenewsAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" /> Vence: {clinic.planRenewsAt}
                            </span>
                          )}
                        </div>

                        {clinic.notes && (
                          <div className="text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded border border-amber-100/80">
                            "{clinic.notes}"
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {/* Card Actions */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEnterClinic(clinic)}
                        className={`text-xs h-8 flex-1 gap-1.5 font-medium ${
                          isCurrentlyActive 
                            ? "bg-amber-600 hover:bg-amber-700 text-white" 
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {isCurrentlyActive ? "En esta clínica" : "Entrar a Clínica"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedClinic(clinic);
                          setWelcomeModalOpen(true);
                        }}
                        className="text-xs h-8 px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                        title="Ficha de Bienvenida para WhatsApp"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Ficha
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 outline-none">
                          <MoreVertical className="h-4 w-4 text-slate-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuLabel>Opciones de Clínica</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditModal(clinic)}>
                            <Edit3 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                            Editar Plan y Datos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyWelcomeToClipboard(clinic)}>
                            <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                            Copiar Ficha Acceso
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClinic(clinic)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Eliminar Clínica
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Leads / Demo Requests */}
        <TabsContent value="leads" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 sm:p-6 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Prospectos y Solicitudes de Demostración
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Médicos que han llenado el formulario de contacto o solicitud de demo desde la página pública.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {demoRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm">Aún no hay solicitudes de prospectos registradas.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {demoRequests.map((lead) => (
                    <div key={lead.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {lead.name || lead.doctorName || "Doctor Interesado"}
                          </span>
                          {lead.specialty && (
                            <Badge variant="secondary" className="text-[10px]">
                              {lead.specialty}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-400" /> {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" /> {lead.phone}
                            </span>
                          )}
                        </div>
                        {lead.message && (
                          <p className="text-xs text-slate-600 bg-slate-100/70 p-2 rounded mt-2 border border-slate-200">
                            "{lead.message}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {lead.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const cleanPhone = lead.phone?.replace(/[^0-9]/g, "");
                              window.open(`https://wa.me/${cleanPhone}?text=Hola%20Dr(a).%20${encodeURIComponent(lead.name || "")},%20le%20escribo%20de%20Vitela%20respecto%20a%20su%20solicitud...`, "_blank");
                            }}
                            className="text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleConvertLead(lead)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Crear Clínica & Acceso
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: SuperAdmins */}
        <TabsContent value="admins" className="space-y-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-4 sm:p-6 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Equipo de Super Administradores
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cuentas maestras con permisos globales de gestión de clínicas y seguridad.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SUPER_ADMIN_EMAILS.map((email, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
                        {email.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{email}</div>
                        <div className="text-xs text-emerald-600 font-medium">● Acceso Maestro Activo</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                      SuperAdmin
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1.5 mt-4">
                <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Seguridad en Firestore Rules
                </div>
                <p>
                  El rol de Super Administrador está respaldado por las reglas de seguridad de Firestore (<code>firestore.rules</code>). Permite listar todas las clínicas, administrar a los usuarios y prestar soporte técnico de forma segura y transparente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: ALTA DE NUEVA CLÍNICA / DOCTOR */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Alta de Nueva Clínica & Doctor Titular
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra la clínica para tu cliente. El doctor podrá entrar de inmediato iniciando sesión con su correo de Google.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClinic} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Nombre de la Clínica o Consultorio *
                </Label>
                <Input
                  placeholder="Ej: Consultorio Pediátrico Santa María"
                  value={newClinic.name}
                  onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Nombre Completo del Doctor Titular *
                </Label>
                <Input
                  placeholder="Ej: Dr. Roberto Mendoza"
                  value={newClinic.doctorName}
                  onChange={(e) => setNewClinic({ ...newClinic, doctorName: e.target.value })}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Correo Electrónico (Gmail / Google) *
                </Label>
                <Input
                  type="email"
                  placeholder="doctor@gmail.com"
                  value={newClinic.contactEmail}
                  onChange={(e) => setNewClinic({ ...newClinic, contactEmail: e.target.value })}
                  required
                  className="h-9 text-sm"
                />
                <span className="text-[10px] text-slate-500 block">
                  Con este correo el médico iniciará sesión con Google.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp de Contacto
                </Label>
                <Input
                  placeholder="Ej: +52 55 1234 5678"
                  value={newClinic.doctorPhone}
                  onChange={(e) => setNewClinic({ ...newClinic, doctorPhone: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Especialidad Médica
                </Label>
                <Input
                  placeholder="Ej: Pediatría, Ginecología, etc."
                  value={newClinic.specialty}
                  onChange={(e) => setNewClinic({ ...newClinic, specialty: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Plan SaaS Asignado
                </Label>
                <select
                  value={newClinic.plan}
                  onChange={(e) => setNewClinic({ ...newClinic, plan: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white outline-none"
                >
                  <option value="Básico">Plan Básico ($599/mes)</option>
                  <option value="Pro">Plan Pro ($1,199/mes) - Recomendado</option>
                  <option value="Enterprise">Plan Enterprise ($2,499/mes)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Estado Inicial
                </Label>
                <select
                  value={newClinic.planStatus}
                  onChange={(e) => setNewClinic({ ...newClinic, planStatus: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white outline-none"
                >
                  <option value="trial">Prueba de 14 días</option>
                  <option value="active">Activo (Pagado)</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Notas Privadas de Administración (Opcional)
                </Label>
                <Input
                  placeholder="Ej: Pago transferido anual, acordamos capacitación el lunes..."
                  value={newClinic.notes}
                  onChange={(e) => setNewClinic({ ...newClinic, notes: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="sm:col-span-2 bg-blue-50/70 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-950">Precargar Pacientes y Datos Demo</div>
                  <div className="text-[11px] text-blue-700">Crea 3 pacientes de ejemplo para que el doctor pueda probar el sistema de inmediato.</div>
                </div>
                <input
                  type="checkbox"
                  checked={newClinic.seedDemoData}
                  onChange={(e) => setNewClinic({ ...newClinic, seedDemoData: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Creando...
                  </>
                ) : (
                  "Crear Clínica & Generar Acceso"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR CLÍNICA */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-indigo-600" />
              Editar Clínica & Suscripción
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Actualiza el plan SaaS, datos de contacto o estado del cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditClinic} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nombre de la Clínica</Label>
              <Input
                value={editClinicData.name}
                onChange={(e) => setEditClinicData({ ...editClinicData, name: e.target.value })}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Doctor Titular</Label>
                <Input
                  value={editClinicData.doctorName}
                  onChange={(e) => setEditClinicData({ ...editClinicData, doctorName: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Correo Electrónico</Label>
                <Input
                  value={editClinicData.contactEmail}
                  onChange={(e) => setEditClinicData({ ...editClinicData, contactEmail: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp</Label>
                <Input
                  value={editClinicData.doctorPhone}
                  onChange={(e) => setEditClinicData({ ...editClinicData, doctorPhone: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Especialidad</Label>
                <Input
                  value={editClinicData.specialty}
                  onChange={(e) => setEditClinicData({ ...editClinicData, specialty: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Plan</Label>
                <select
                  value={editClinicData.plan}
                  onChange={(e) => setEditClinicData({ ...editClinicData, plan: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white outline-none"
                >
                  <option value="Básico">Plan Básico ($599/mes)</option>
                  <option value="Pro">Plan Pro ($1,199/mes)</option>
                  <option value="Enterprise">Plan Enterprise ($2,499/mes)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Estado del Plan</Label>
                <select
                  value={editClinicData.planStatus}
                  onChange={(e) => setEditClinicData({ ...editClinicData, planStatus: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white outline-none"
                >
                  <option value="active">Activo (Pagado)</option>
                  <option value="trial">En Prueba (14d)</option>
                  <option value="overdue">Vencido</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Notas de Facturación / Contrato</Label>
              <Input
                value={editClinicData.notes}
                onChange={(e) => setEditClinicData({ ...editClinicData, notes: e.target.value })}
                placeholder="Notas internas..."
                className="h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
              >
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: FICHA DE BIENVENIDA / ACCESO */}
      {selectedClinic && (
        <Dialog open={welcomeModalOpen} onOpenChange={setWelcomeModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                Ficha de Entrega & Bienvenida al Doctor
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Copia este mensaje listo para enviar por WhatsApp o correo al médico para que pueda acceder a su consultorio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed max-h-72 overflow-y-auto">
                {getWelcomeText(selectedClinic)}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <Button
                  onClick={() => copyWelcomeToClipboard(selectedClinic)}
                  variant="outline"
                  className="w-full sm:flex-1 text-xs gap-1.5"
                >
                  {copiedWelcome ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copiedWelcome ? "¡Copiado con Éxito!" : "Copiar al Portapapeles"}
                </Button>

                <Button
                  onClick={() => openWhatsAppDirect(selectedClinic)}
                  className="w-full sm:flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageSquare className="h-4 w-4" />
                  Enviar por WhatsApp Directo
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="ghost"
                onClick={() => setWelcomeModalOpen(false)}
                className="text-xs text-slate-500"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
