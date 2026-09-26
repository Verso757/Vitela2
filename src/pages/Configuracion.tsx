import { useState, useEffect } from "react";
import { Save, User, Building, Shield, Bell, CreditCard, Loader2, Database, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc, collection, addDoc, writeBatch } from "firebase/firestore";
import { DEFAULT_WA_REMINDER, DEFAULT_WA_CONFIRM } from "../lib/constants";

export default function Configuracion() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // WhatsApp templates
  const [waReminder, setWaReminder] = useState(() => localStorage.getItem("clinic_wa_reminder_template") || DEFAULT_WA_REMINDER);
  const [waConfirm, setWaConfirm] = useState(() => localStorage.getItem("clinic_wa_confirm_template") || DEFAULT_WA_CONFIRM);

  // Profile
  const [profile, setProfile] = useState({
    name: "",
    lastName: "",
    specialty: "",
    cedulaProfesional: "",
    cedulaEspecialidad: "",
    email: ""
  });

  // Clinic
  const [clinic, setClinic] = useState({
    name: "",
    rfc: "",
    regimen: "",
    address: ""
  });

  useEffect(() => {
    async function loadData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.id));
        if (userDoc.exists()) {
          const d = userDoc.data();
          setProfile({
            name: d.name || "",
            lastName: d.lastName || "",
            specialty: d.specialty || "",
            cedulaProfesional: d.cedulaProfesional || "",
            cedulaEspecialidad: d.cedulaEspecialidad || "",
            email: d.email || ""
          });
        }

        if (user.clinicId) {
          const clinicDoc = await getDoc(doc(db, "clinics", user.clinicId));
          if (clinicDoc.exists()) {
            const c = clinicDoc.data();
            setClinic({
              name: c.name || "",
              rfc: c.rfc || "",
              regimen: c.regimen || "",
              address: c.address || ""
            });
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Error al cargar la configuración");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        name: profile.name,
        specialty: profile.specialty,
        cedulaProfesional: profile.cedulaProfesional,
        cedulaEspecialidad: profile.cedulaEspecialidad,
      });

      if (user.clinicId) {
        await updateDoc(doc(db, "clinics", user.clinicId), {
          name: clinic.name,
          rfc: clinic.rfc,
          regimen: clinic.regimen,
          address: clinic.address
        });
      }
      
      localStorage.setItem("clinic_wa_reminder_template", waReminder);
      localStorage.setItem("clinic_wa_confirm_template", waConfirm);

      toast.success("Configuración guardada exitosamente");
    } catch(err) {
      console.error(err);
      toast.error("Error al guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedData = async () => {
    if (!user?.clinicId) return;
    try {
      setIsSaving(true);
      toast.info("Inyectando datos de prueba...");
      
      const clinicRef = doc(db, "clinics", user.clinicId);
      
      // Seed Patients
      const patientsCollection = collection(clinicRef, "patients");
      const p1 = await addDoc(patientsCollection, { name: "Alejandro Pérez Vázquez", email: "alex.pv@ejemplo.com", phone: "5512345678", dob: "1985-04-12", gender: "Masculino", bloodType: "O+", allergies: "Penicilina", joinDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() });
      const p2 = await addDoc(patientsCollection, { name: "María Gómez López", email: "maria.g@ejemplo.com", phone: "5587654321", dob: "1992-08-25", gender: "Femenino", bloodType: "A+", allergies: "Ninguna", joinDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() });
      const p3 = await addDoc(patientsCollection, { name: "Roberto Torres Díaz", email: "roberto@ejemplo.com", phone: "8111223344", dob: "1978-11-03", gender: "Masculino", bloodType: "B-", allergies: "Ibuprofeno", joinDate: new Date().toISOString() });

      // Seed Inventory
      const invCollection = collection(clinicRef, "inventory");
      await addDoc(invCollection, { nombre: "Paracetamol 500mg", sku: "MED-001", cantidad: 120, minimo: 50, categoria: "Medicamentos" });
      await addDoc(invCollection, { nombre: "Amoxicilina 250mg", sku: "MED-002", cantidad: 15, minimo: 30, categoria: "Antibióticos" });
      await addDoc(invCollection, { nombre: "Jeringas 5ml", sku: "INS-001", cantidad: 5, minimo: 200, categoria: "Insumos" });
      await addDoc(invCollection, { nombre: "Gasa estéril", sku: "INS-002", cantidad: 500, minimo: 100, categoria: "Material Curación" });

      // Seed Incomes
      const invRef = collection(clinicRef, "invoices");
      await addDoc(invRef, { paciente: "Alejandro Pérez Vázquez", concepto: "Consulta de Especialidad", monto: 1500, fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), estado: "Pagado", metodoPago: "Tarjeta de Débito", notas: "Pago terminal #8812" });
      await addDoc(invRef, { paciente: "María Gómez López", concepto: "Curación y Sutura Menor", monto: 900, fecha: new Date().toISOString(), estado: "Pendiente", metodoPago: "Efectivo", notas: "Pendiente de liquidación" });

      // Seed Records (Consultas P1)
      const recordsCollection = collection(clinicRef, "records");
      await addDoc(recordsCollection, { patientId: p1.id, type: "consulta", content: "Motivo: Revisión Anual\n\nSubjetivo: Paciente asintomático.\n\nObjetivo: TA 120/80.\n\nAnálisis/Diagnóstico: Paciente Sano.\n\nPlan: Seguir rutinas alimenticias.", date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), authorId: user.id });
      await addDoc(recordsCollection, { patientId: p1.id, type: "receta", content: "Paracetamol 500mg - 1 pastilla cada 8 hrs", date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), authorId: user.id });
      
      toast.success("¡Datos de prueba inyectados correctamente!");
    } catch(e) {
      console.error(e);
      toast.error("Error al inyectar datos falsos");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex p-10 justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Configuración</h1>
          <p className="text-slate-500 mt-1">Administra la cuenta de tu clínica, facturación y preferencias.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="bg-slate-100 border-none p-1 rounded-xl">
          <TabsTrigger value="perfil" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
             <User className="w-4 h-4 mr-2" /> Mi Perfil
          </TabsTrigger>
          <TabsTrigger value="clinica" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
             <Building className="w-4 h-4 mr-2" /> Clínica / Consultorio
          </TabsTrigger>
          <TabsTrigger value="personal" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
             <User className="w-4 h-4 mr-2" /> Personal y Roles
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
             <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" /> WhatsApp y Mensajes
          </TabsTrigger>
          <TabsTrigger value="suscripcion" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
             <CreditCard className="w-4 h-4 mr-2" /> Suscripción (SaaS)
          </TabsTrigger>
          {user?.role === "owner" && (
            <TabsTrigger value="desarrollo" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
               <Database className="w-4 h-4 mr-2" /> Desarrollador
            </TabsTrigger>
          )}
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="perfil" className="space-y-6 outline-none">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Información Personal</CardTitle>
                <CardDescription>Estos datos se utilizarán para la firma de tus recetas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2 lg:col-span-2">
                      <Label>Nombre Completo</Label>
                      <Input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <Label>Especialidad</Label>
                      <Input value={profile.specialty} onChange={e => setProfile({...profile, specialty: e.target.value})} placeholder="Ej. Cardiología" className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <Label>Correo de Contacto</Label>
                      <Input disabled value={profile.email} className="bg-slate-50 rounded-xl border-slate-200 text-slate-500" />
                   </div>
                   <div className="space-y-2">
                      <Label>Cédula Profesional</Label>
                      <Input value={profile.cedulaProfesional} onChange={e => setProfile({...profile, cedulaProfesional: e.target.value})} className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <Label>Cédula de Especialidad</Label>
                      <Input value={profile.cedulaEspecialidad} onChange={e => setProfile({...profile, cedulaEspecialidad: e.target.value})} className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinica" className="outline-none">
             <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Datos de Facturación y Clínica</CardTitle>
                <CardDescription>Información del CFDI 4.0 y ubicación para recetario físico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2 md:col-span-2">
                      <Label>Razón Social / Nombre Comercial</Label>
                      <Input value={clinic.name} onChange={e => setClinic({...clinic, name: e.target.value})} className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <Label>RFC</Label>
                      <Input value={clinic.rfc} onChange={e => setClinic({...clinic, rfc: e.target.value})} placeholder="XAXX010101000" className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <Label>Régimen Fiscal</Label>
                      <Input value={clinic.regimen} onChange={e => setClinic({...clinic, regimen: e.target.value})} placeholder="601 - General de Ley Personas Morales" className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                      <Label>Dirección del Consultorio</Label>
                      <Input value={clinic.address} onChange={e => setClinic({...clinic, address: e.target.value})} placeholder="Av. Principal #123..." className="bg-slate-50 rounded-xl border-slate-200" />
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal" className="outline-none">
             <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Personal Autorizado</CardTitle>
                  <CardDescription>Invita y gestiona el acceso de asistentes y otros médicos a tu clínica.</CardDescription>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
                  + Invitar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[400px] overflow-y-auto mt-2">
                <div className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
                       {profile.name.substring(0,2)}
                     </div>
                     <div>
                       <p className="font-medium text-slate-900">{profile.name || 'Propietario'}</p>
                       <p className="text-sm text-slate-500">{profile.email}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">Propietario</span>
                     <Button variant="ghost" size="sm" className="hidden" disabled>Editar</Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6 outline-none">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                      Plantillas de Mensajes de WhatsApp
                    </CardTitle>
                    <CardDescription>
                      Personaliza los textos automáticos que se envían a tus pacientes al agendar y al recordar sus citas.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWaReminder(DEFAULT_WA_REMINDER);
                      setWaConfirm(DEFAULT_WA_CONFIRM);
                      toast.info("Plantillas restauradas a los valores sugeridos.");
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 rounded-xl"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restaurar Predeterminados
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Guide of dynamic variables */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs space-y-2">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Variables dinámicas automáticas (el sistema las reemplaza al enviar):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-emerald-800">
                    <div><code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px] font-bold">{"{paciente}"}</code>: Nombre</div>
                    <div><code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px] font-bold">{"{clinica}"}</code>: Tu clínica</div>
                    <div><code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px] font-bold">{"{fecha}"}</code>: Día cita</div>
                    <div><code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px] font-bold">{"{hora}"}</code>: Horario</div>
                    <div><code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px] font-bold">{"{tipo}"}</code>: Motivo/tipo</div>
                  </div>
                </div>

                {/* Template 1: Recordatorio Previo */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-slate-800">
                      1. Mensaje de Recordatorio de Cita (Enviado previo a la consulta)
                    </Label>
                    <span className="text-[11px] text-slate-400">Usado en el botón "Recordatorio WhatsApp" de la Agenda</span>
                  </div>
                  <Textarea
                    rows={4}
                    value={waReminder}
                    onChange={(e) => setWaReminder(e.target.value)}
                    placeholder="Escribe la plantilla de recordatorio..."
                    className="font-mono text-xs leading-relaxed bg-slate-50 border-slate-200 rounded-xl"
                  />
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Vista previa con datos de ejemplo:</span>
                    <p className="italic text-slate-700">
                      "{waReminder
                        .replace(/\{paciente\}/g, "Carlos Gómez")
                        .replace(/\{clinica\}/g, clinic.name || "Clínica Médica")
                        .replace(/\{fecha\}/g, "viernes 25 de septiembre")
                        .replace(/\{hora\}/g, "10:30")
                        .replace(/\{tipo\}/g, "Consulta General")}"
                    </p>
                  </div>
                </div>

                {/* Template 2: Confirmación al Agendar */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-slate-800">
                      2. Mensaje de Confirmación Inmediata (Enviado al crear o aceptar cita)
                    </Label>
                    <span className="text-[11px] text-slate-400">Ofrecido al crear una cita en la Agenda</span>
                  </div>
                  <Textarea
                    rows={3}
                    value={waConfirm}
                    onChange={(e) => setWaConfirm(e.target.value)}
                    placeholder="Escribe la plantilla de confirmación al agendar..."
                    className="font-mono text-xs leading-relaxed bg-slate-50 border-slate-200 rounded-xl"
                  />
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Vista previa con datos de ejemplo:</span>
                    <p className="italic text-slate-700">
                      "{waConfirm
                        .replace(/\{paciente\}/g, "Carlos Gómez")
                        .replace(/\{clinica\}/g, clinic.name || "Clínica Médica")
                        .replace(/\{fecha\}/g, "viernes 25 de septiembre")
                        .replace(/\{hora\}/g, "10:30")
                        .replace(/\{tipo\}/g, "Consulta")}"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suscripcion" className="outline-none">
             <Card className="rounded-2xl border-slate-200 shadow-sm border-blue-100 overflow-hidden">
              <div className="bg-blue-50/50 p-6 border-b border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <h3 className="font-semibold text-blue-900 text-lg">Plan Profesional Timbres Ilimitados</h3>
                    <p className="text-blue-700/80 text-sm mt-1">Suscripción Activa</p>
                 </div>
                 <Button variant="outline" className="bg-white text-blue-700 border-blue-200 hover:bg-blue-50">Gestionar Plan</Button>
              </div>
              <CardContent className="p-6">
                 <div className="space-y-4">
                    <h4 className="font-medium text-slate-900">Uso de este mes</h4>
                    <div className="space-y-3">
                       <div>
                          <div className="flex justify-between text-sm mb-1">
                             <span className="text-slate-600">Pacientes Activos</span>
                             <span className="font-medium">102 / ilimitados</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                             <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                          </div>
                       </div>
                       <div>
                          <div className="flex justify-between text-sm mb-1">
                             <span className="text-slate-600">Almacenamiento (Estudios médicos)</span>
                             <span className="font-medium">1.5GB / 50GB</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                             <div className="bg-blue-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                          </div>
                       </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === "owner" && (
            <TabsContent value="desarrollo" className="outline-none">
              <Card className="rounded-2xl border-slate-200 shadow-sm border-amber-100 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">Herramientas de Desarrollador</CardTitle>
                  <CardDescription>Opciones para realizar pruebas y demostraciones de la funcionalidad del software.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                     <div>
                       <h4 className="font-semibold text-amber-900">Inyectar Datos Falsos (Demo)</h4>
                       <p className="text-amber-700 text-sm">Agrega pacientes de prueba, facturas, recetas, y un inventario de 4 medicamentos base.</p>
                     </div>
                     <Button onClick={handleSeedData} variant="outline" className="mt-3 md:mt-0 bg-white border-amber-200 text-amber-800 hover:bg-amber-100">
                        <Database className="w-4 h-4 mr-2" /> Poblar Base de Datos
                     </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
