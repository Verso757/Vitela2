import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User as UserIcon, MessageCircle, Copy, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, where, addDoc, getDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { DEFAULT_WA_REMINDER, DEFAULT_WA_CONFIRM } from "../lib/constants";

interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  patientTel?: string;
  date: string;
  time: string;
  type?: string;
  status: string;
}

interface Patient {
  id: string;
  nombre: string;
  tel?: string;
}

interface PublicRequest {
  id: string;
  name: string;
  phone: string;
  reason: string;
  date: string;
  time: string;
  status: string;
}

export default function Agenda() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicName, setClinicName] = useState("Clínica Médica");
  const [loading, setLoading] = useState(true);
  const [publicRequests, setPublicRequests] = useState<PublicRequest[]>([]);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAppt, setNewAppt] = useState({
    patientId: "",
    time: "09:00",
    type: "Primera vez"
  });

  // WhatsApp Dialog State (Preview & Quick Edit before sending)
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waPatientName, setWaPatientName] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("");

  useEffect(() => {
    if (!user?.clinicId) return;

    // Fetch Clinic info
    getDoc(doc(db, "clinics", user.clinicId)).then((snap) => {
      if (snap.exists() && snap.data().name) {
        setClinicName(snap.data().name);
      }
    }).catch(console.error);

    // Fetch Patients for the select dropdown
    const patientsUnsub = onSnapshot(collection(db, "clinics", user.clinicId, "patients"), (snapshot) => {
      const pts: Patient[] = [];
      snapshot.forEach(doc => pts.push({ id: doc.id, nombre: doc.data().name || doc.data().nombre, tel: doc.data().tel }));
      setPatients(pts);
    });

    // Fetch pending requests
    const reqsQuery = query(collection(db, "clinics", user.clinicId, "public_requests"), where("status", "==", "pending"));
    const reqsUnsub = onSnapshot(reqsQuery, (snapshot) => {
      const reqs: PublicRequest[] = [];
      snapshot.forEach(doc => reqs.push({id: doc.id, ...doc.data()} as PublicRequest));
      setPublicRequests(reqs);
    });

    return () => {
      patientsUnsub();
      reqsUnsub();
    };
  }, [user]);

  useEffect(() => {
    if (!user?.clinicId || !date) return;
    setLoading(true);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const apptQuery = query(
      collection(db, "clinics", user.clinicId, "appointments"),
      where("date", "==", dateString)
    );

    const apptUnsub = onSnapshot(apptQuery, async (snapshot) => {
      // Fetch names and phones concurrently
      const fetchNamesPromises = snapshot.docs.map(async (d) => {
        const data = d.data();
        let patientName = "Paciente";
        let patientTel = "";
        try {
          const ptDoc = await getDoc(doc(db, "clinics", user.clinicId, "patients", data.patientId));
          if (ptDoc.exists()) {
            const ptData = ptDoc.data();
            patientName = ptData.name || ptData.nombre || "Paciente";
            patientTel = ptData.tel || "";
          }
        } catch(e) {}
        
        return {
          id: d.id,
          ...data,
          patientName,
          patientTel
        } as Appointment;
      });

      const resolvedAppts = await Promise.all(fetchNamesPromises);
      setAppointments(resolvedAppts);
      setLoading(false);
    });

    return () => apptUnsub();
  }, [user, date]);

  const sendWhatsAppReminder = (cita: Appointment) => {
    const rawTel = (cita.patientTel || "").trim();
    const cleanPhone = rawTel.replace(/[^0-9]/g, "");
    const formattedDate = date 
      ? date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) 
      : cita.date;
    
    const reminderTpl = localStorage.getItem("clinic_wa_reminder_template") || DEFAULT_WA_REMINDER;
    const msg = reminderTpl
      .replace(/\{paciente\}/g, cita.patientName || "estimado paciente")
      .replace(/\{clinica\}/g, clinicName)
      .replace(/\{fecha\}/g, formattedDate)
      .replace(/\{hora\}/g, cita.time)
      .replace(/\{tipo\}/g, cita.type || "Consulta");

    setWaPatientName(cita.patientName || "Paciente");
    setWaPhone(cleanPhone);
    setWaMessage(msg);
    setWaDialogOpen(true);
  };

  const handleSendCustomWhatsApp = () => {
    const cleanPhone = waPhone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      toast.error("Por favor ingresa un número de teléfono válido (10 dígitos).");
      return;
    }

    const phoneWithCountry = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, "_blank");
    setWaDialogOpen(false);
    toast.success(`Abriendo WhatsApp para ${waPatientName}`);
  };

  const handleDayChange = (offset: number) => {
    if (date) {
      const newDate = new Date(date);
      newDate.setDate(date.getDate() + offset);
      setDate(newDate);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId || !date || !newAppt.patientId) return;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, "clinics", user.clinicId, "appointments"), {
        patientId: newAppt.patientId,
        date: dateString,
        time: newAppt.time,
        type: newAppt.type,
        status: "confirmado"
      });

      const selectedPt = patients.find(p => p.id === newAppt.patientId);
      const ptName = selectedPt?.nombre || "Paciente";
      const ptTel = selectedPt?.tel || "";
      const cleanPhone = ptTel.replace(/[^0-9]/g, "");
      const phoneWithCountry = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;

      const confirmTpl = localStorage.getItem("clinic_wa_confirm_template") || DEFAULT_WA_CONFIRM;
      const formattedDate = date ? date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : dateString;
      const confirmMsg = confirmTpl
        .replace(/\{paciente\}/g, ptName)
        .replace(/\{clinica\}/g, clinicName)
        .replace(/\{fecha\}/g, formattedDate)
        .replace(/\{hora\}/g, newAppt.time)
        .replace(/\{tipo\}/g, newAppt.type || "Consulta");

      setIsDialogOpen(false);
      setNewAppt({ ...newAppt, patientId: "" });

      if (cleanPhone) {
        toast.success("Cita agendada correctamente", {
          action: {
            label: "Enviar WhatsApp",
            onClick: () => window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(confirmMsg)}`, '_blank')
          }
        });
      } else {
        toast.success("Cita agendada correctamente (sin teléfono registrado)");
      }
    } catch(err) {
      console.error(err);
      toast.error("Error al agendar la cita");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!user?.clinicId) return;
    const url = window.location.origin + "/reserva/" + user.clinicId;
    navigator.clipboard.writeText(url);
    toast("Link copiado al portapapeles", {
      description: "Compártelo con tus pacientes para que agenden solos.",
    });
  };

  const handleApproveRequest = async (req: PublicRequest) => {
    if (!user?.clinicId) return;
    try {
      // Find if patient exists by phone or name, simple approach: just add as new patient if not found by name
      let patientId;
      const existing = patients.find(p => p.tel === req.phone || p.nombre.toLowerCase() === req.name.toLowerCase());
      
      if (existing) {
        patientId = existing.id;
      } else {
        const docRef = await addDoc(collection(db, "clinics", user.clinicId, "patients"), {
          name: req.name,
          tel: req.phone,
          edad: 0,
          sexo: 'O'
        });
        patientId = docRef.id;
      }

      await addDoc(collection(db, "clinics", user.clinicId, "appointments"), {
        patientId,
        date: req.date,
        time: req.time,
        type: "Consulta",
        status: "confirmado"
      });

      await updateDoc(doc(db, "clinics", user.clinicId, "public_requests", req.id), {
        status: "approved"
      });

      const cleanReqPhone = req.phone.replace(/[^0-9]/g, "");
      const phoneWithCountry = cleanReqPhone.length === 10 ? `52${cleanReqPhone}` : cleanReqPhone;
      const confirmMsg = `Hola ${req.name}, le confirmamos que su cita en ${clinicName} ha sido aceptada para el día ${req.date} a las ${req.time} hrs. ¡Le esperamos!`;

      toast.success("Cita aceptada y agendada", {
        action: {
          label: "Avisar por WhatsApp",
          onClick: () => window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(confirmMsg)}`, '_blank')
        }
      });
    } catch(e) {
      console.error(e);
      toast.error("Error al aprobar la cita.");
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (!user?.clinicId) return;
    try {
      await updateDoc(doc(db, "clinics", user.clinicId, "public_requests", reqId), {
        status: "rejected"
      });
      toast.success("Solicitud rechazada");
    } catch(e) {
      console.error(e);
      toast.error("Error al rechazar");
    }
  };

  // Helper to map type to colors
  const getTypeColor = (type: string) => {
    if (type === "Primera vez") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (type === "Segunda vez" || type === "Seguimiento") return "bg-blue-100 text-blue-700 border-blue-200";
    if (type === "Resultados") return "bg-violet-100 text-violet-700 border-violet-200";
    if (type === "Urgencia") return "bg-red-100 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Agenda Médica</h1>
          <p className="text-slate-500 mt-1">Gestiona tus citas y horarios de atención.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 shadow-sm" onClick={handleCopyLink}>
             <Copy className="mr-2 h-4 w-4" /> Link Portal
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Agendar Cita
          </Button>
        </div>
      </div>

      {publicRequests.length > 0 && (
        <Card className="border-blue-200 shadow-sm bg-blue-50/50">
          <CardHeader className="pb-3 border-b border-blue-100">
            <CardTitle className="text-base text-blue-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" /> Solicitudes Pendientes ({publicRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {publicRequests.map(req => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-900 leading-tight">{req.name}</p>
                  <p className="text-sm text-slate-500">{req.date} a las {req.time} • Tel: {req.phone}</p>
                  {(req.reason && req.reason !== "Sin especificar") && <p className="text-xs text-slate-600 mt-1 italic">"{req.reason}"</p>}
                </div>
                <div className="flex gap-2 mt-3 sm:mt-0">
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectRequest(req.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApproveRequest(req)}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Aprobar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddAppointment}>
            <DialogHeader>
              <DialogTitle>Agendar Nueva Cita</DialogTitle>
              <DialogDescription>
                Selecciona un paciente y la hora para el día {date?.toLocaleDateString()}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patientId">Paciente</Label>
                <select 
                  id="patientId"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newAppt.patientId}
                  onChange={(e) => setNewAppt({...newAppt, patientId: e.target.value})}
                >
                  <option value="" disabled>Selecciona un paciente</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input 
                    id="time" 
                    type="time"
                    required
                    value={newAppt.time}
                    onChange={(e) => setNewAppt({...newAppt, time: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Cita</Label>
                  <select 
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newAppt.type}
                    onChange={(e) => setNewAppt({...newAppt, type: e.target.value})}
                  >
                    <option value="Primera vez">Primera vez</option>
                    <option value="Seguimiento">Seguimiento</option>
                    <option value="Resultados">Resultados</option>
                    <option value="Urgencia">Urgencia</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || patients.length === 0} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar y Personalizar Recordatorio WhatsApp */}
      <Dialog open={waDialogOpen} onOpenChange={setWaDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg">
              <MessageCircle className="w-5 h-5 text-emerald-600 fill-emerald-600" />
              Enviar Recordatorio por WhatsApp
            </DialogTitle>
            <DialogDescription>
              Paciente: <span className="font-semibold text-slate-800">{waPatientName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="waPhone" className="text-xs font-semibold text-slate-700">
                Número de Teléfono / Celular (10 dígitos)
              </Label>
              <Input
                id="waPhone"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="Ej. 5512345678"
                className="font-mono rounded-xl border-slate-200"
              />
              <p className="text-[11px] text-slate-400">Se agregará automáticamente el código de país +52 para México.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="waMessage" className="text-xs font-semibold text-slate-700">
                  Mensaje a enviar (puedes editarlo o agregar notas):
                </Label>
              </div>
              <Textarea
                id="waMessage"
                rows={5}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                className="text-xs leading-relaxed bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(waMessage);
                toast.success("Mensaje copiado al portapapeles");
              }}
              className="rounded-xl text-xs"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Texto
            </Button>
            <Button
              type="button"
              onClick={handleSendCustomWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5 fill-white text-emerald-600" /> Abrir WhatsApp y Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Calendar */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden text-center bg-white">
             <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="p-3 mx-auto"
              />
          </Card>
          
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold">Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div><span className="text-sm text-slate-600">Primera vez</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div><span className="text-sm text-slate-600">Seguimiento</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-400"></div><span className="text-sm text-slate-600">Resultados</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div><span className="text-sm text-slate-600">Urgencias</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Daily Schedule view */}
        <Card className="lg:col-span-8 xl:col-span-9 rounded-2xl border-slate-200 shadow-sm bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleDayChange(-1)} className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                <div className="w-48 text-center font-medium flex items-center justify-center gap-2">
                   <CalendarIcon className="h-4 w-4 text-slate-400" />
                   {date ? date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecciona un día'}
                </div>
                <Button variant="outline" size="icon" onClick={() => handleDayChange(1)} className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
             </div>
             <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDate(new Date())} className="hidden sm:flex rounded-lg">Hoy</Button>
             </div>
          </div>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-100 relative min-h-[400px]">
                {loading && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                )}
                {/* Generates a simple timeline */}
                {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'].map((hour) => {
                  return (
                    <div key={hour} className="flex min-h-[80px] group relative">
                       <div className="w-20 p-4 border-r border-slate-100 text-xs font-mono text-slate-400 shrink-0 select-none text-right">
                          {hour}
                       </div>
                       <div className="flex-1 p-2 relative bg-slate-50/20 group-hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col gap-2">
                             {appointments.filter(c => c.time.startsWith(hour.split(':')[0])).map(cita => (
                               <div key={cita.id} className={`p-3 rounded-xl border ${getTypeColor(cita.type || '')} shadow-sm backdrop-blur-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white/95`}>
                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-30"></div>
                                 <div className="flex justify-between items-start gap-2">
                                    <div className="font-semibold text-sm flex items-center gap-1.5 text-slate-900">
                                      <UserIcon className="w-4 h-4 opacity-70 text-slate-500" />
                                      <span>{cita.patientName}</span>
                                      {cita.status === 'confirmado' ? (
                                        <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded ml-1">
                                          Confirmado
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-1">
                                          Pendiente
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs font-mono font-medium flex items-center gap-1 text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {cita.time}
                                    </div>
                                 </div>
                                 <div className="flex justify-between mt-2.5 items-center gap-2">
                                    <div className="text-xs text-slate-600 font-medium">
                                      {cita.type || "Consulta"}
                                      {cita.patientTel && <span className="text-[11px] text-slate-400 font-mono ml-2">• {cita.patientTel}</span>}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        sendWhatsAppReminder(cita);
                                      }}
                                      title="Enviar recordatorio por WhatsApp"
                                      className="h-6 px-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-md shadow-xs flex items-center gap-1 shrink-0"
                                    >
                                      <MessageCircle className="w-3 h-3 fill-white text-emerald-600" />
                                      <span>Recordatorio WhatsApp</span>
                                    </Button>
                                 </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )
                })}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

