import { useParams, Link } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, User as UserIcon, Activity, FileText, Pill, Calendar, Upload, Plus, AlertCircle, FileDigit, MessageCircle, Loader2, Send, DollarSign, Package, Sparkles, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// ... existing code down to records ...
interface Paciente {
  id: string;
  name: string;
  edad: number;
  sexo: string;
  tel: string;
  rfc?: string;
  sangre?: string;
  peso?: string;
  altura?: string;
  presion?: string;
}

interface RecordEntity {
  id: string;
  patientId: string;
  type: "nota" | "receta";
  content: string;
  date: string;
  authorId: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'patient' | 'doctor';
  createdAt: any;
}

export default function Expediente() {
  const { id } = useParams();
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor" || user?.role === "owner";

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isNotaDialogOpen, setIsNotaDialogOpen] = useState(false);
  const [isConsultaDialogOpen, setIsConsultaDialogOpen] = useState(false);
  const [isRecetaDialogOpen, setIsRecetaDialogOpen] = useState(false);
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false);
  const [isCobroOpen, setIsCobroOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<{ id: string; nombre: string; cantidad: number }[]>([]);
  const [cobroData, setCobroData] = useState({
    concepto: "Consulta Médica",
    customConcepto: "",
    monto: "800",
    metodoPago: "Efectivo",
    descontarStock: false,
    selectedInventoryId: "",
    descontarCantidad: 1,
    notas: ""
  });
  const [newContent, setNewContent] = useState("");
  const [consultaData, setConsultaData] = useState({
    motivo: "",
    subjetivo: "",
    objetivo: "",
    analisis: "",
    plan: ""
  });
  const [vitalsData, setVitalsData] = useState({
    sangre: "",
    peso: "",
    altura: "",
    presion: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.clinicId || !id) return;

    const fetchPatient = async () => {
      try {
        const patientDoc = await getDoc(doc(db, "clinics", user.clinicId, "patients", id));
        if (patientDoc.exists()) {
          setPaciente({ id: patientDoc.id, ...patientDoc.data() } as Paciente);
        }
      } catch (error) {
        console.error("Error fetching patient", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();

    const recordsRef = collection(db, "clinics", user.clinicId, "records");
    const qRecords = query(recordsRef, where("patientId", "==", id));
    
    const unsubscribeRecords = onSnapshot(qRecords, (snapshot) => {
      const data: RecordEntity[] = [];
      snapshot.forEach(doc => data.push({id: doc.id, ...doc.data()} as RecordEntity));
      data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(data);
    });

    const messagesRef = collection(db, "clinics", user.clinicId, "patients", id, "messages");
    const qMessages = query(messagesRef, orderBy("createdAt", "asc"));
    
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => msgs.push({id: doc.id, ...doc.data()} as Message));
      setMessages(msgs);
    });

    const qInv = query(collection(db, "clinics", user.clinicId, "inventory"));
    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      const items: { id: string; nombre: string; cantidad: number }[] = [];
      snapshot.forEach(d => {
        const itemData = d.data();
        items.push({ id: d.id, nombre: itemData.nombre || "Insumo", cantidad: Number(itemData.cantidad) || 0 });
      });
      setInventoryItems(items);
    });

    return () => {
      unsubscribeRecords();
      unsubscribeMessages();
      unsubscribeInv();
    };
  }, [user?.clinicId, id]);

  const handleCobroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId || !paciente) return;

    const montoNum = parseFloat(cobroData.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("Por favor ingresa un monto válido");
      return;
    }

    const finalConcepto = cobroData.concepto === "Personalizado"
      ? (cobroData.customConcepto.trim() || "Tratamiento / Servicio Especial")
      : cobroData.concepto;

    try {
      setIsSubmitting(true);
      let finalNotas = cobroData.notas.trim();

      if (cobroData.descontarStock && cobroData.selectedInventoryId) {
        const itemInv = inventoryItems.find(i => i.id === cobroData.selectedInventoryId);
        if (itemInv) {
          const newQty = Math.max(0, itemInv.cantidad - cobroData.descontarCantidad);
          await updateDoc(doc(db, "clinics", user.clinicId, "inventory", cobroData.selectedInventoryId), {
            cantidad: newQty
          });
          const noteDesc = `Insumo descontado: ${itemInv.nombre} (x${cobroData.descontarCantidad})`;
          finalNotas = finalNotas ? `${finalNotas} • ${noteDesc}` : noteDesc;
        }
      }

      const invRef = await addDoc(collection(db, "clinics", user.clinicId, "invoices"), {
        paciente: paciente.name,
        concepto: finalConcepto,
        monto: montoNum,
        fecha: new Date().toISOString(),
        estado: "Pagado",
        metodoPago: cobroData.metodoPago,
        notas: finalNotas
      });

      toast.success(`Cobro registrado para ${paciente.name} ($${montoNum})`, {
        action: {
          label: "Imprimir Ticket",
          onClick: () => window.open(`/print/ticket/${user.clinicId}/${invRef.id}`, '_blank')
        }
      });
      setIsCobroOpen(false);
      setCobroData({
        concepto: "Consulta Médica",
        customConcepto: "",
        monto: "800",
        metodoPago: "Efectivo",
        descontarStock: false,
        selectedInventoryId: "",
        descontarCantidad: 1,
        notas: ""
      });
    } catch (e) {
      console.error(e);
      toast.error("Error al registrar cobro");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.clinicId || !id) return;

    try {
      await addDoc(collection(db, "clinics", user.clinicId, "patients", id, "messages"), {
        text: newMessage,
        sender: 'doctor',
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateVitals = async () => {
    if (!user?.clinicId || !id) return;
    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "clinics", user.clinicId, "patients", id), {
        sangre: vitalsData.sangre,
        peso: vitalsData.peso,
        altura: vitalsData.altura,
        presion: vitalsData.presion
      });
      setPaciente(prev => prev ? { ...prev, ...vitalsData } : prev);
      setIsVitalsDialogOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRecord = async (type: "nota" | "receta" | "consulta") => {
    if (!user?.clinicId || !id) return;
    try {
      setIsSubmitting(true);
      
      let finalContent = newContent;
      if (type === "consulta") {
        finalContent = `Motivo: ${consultaData.motivo}\n\nSubjetivo: ${consultaData.subjetivo}\n\nObjetivo: ${consultaData.objetivo}\n\nAnálisis/Diagnóstico: ${consultaData.analisis}\n\nPlan: ${consultaData.plan}`;
      }
      
      if (!finalContent.trim()) return;

      await addDoc(collection(db, "clinics", user.clinicId, "records"), {
        patientId: id,
        type: type,
        content: finalContent,
        date: new Date().toISOString(),
        authorId: user.id
      });
      setIsNotaDialogOpen(false);
      setIsRecetaDialogOpen(false);
      setIsConsultaDialogOpen(false);
      setNewContent("");
      setConsultaData({ motivo: "", subjetivo: "", objetivo: "", analisis: "", plan: "" });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;
  }

  if (!paciente) {
    return <div className="p-12 text-center text-slate-500">Paciente no encontrado.</div>;
  }

  const notas = records.filter(r => r.type === "nota");
  const recetas = records.filter(r => r.type === "receta");

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-slate-500 hover:text-slate-900" render={<Link to="/pacientes" />} nativeButton={false}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 min-w-0 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar className="h-20 w-20 ring-4 ring-slate-50">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-semibold">
              {paciente.name ? paciente.name.substring(0, 2).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{paciente.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5"><UserIcon className="h-4 w-4 text-slate-400" /> {paciente.edad} años, {paciente.sexo}</span>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{paciente.id.substring(0,8)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => setIsCobroOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                  <DollarSign className="mr-2 h-4 w-4" /> Registrar Cobro
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm">
                  <Calendar className="mr-2 h-4 w-4" /> Agendar Cita
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isVitalsDialogOpen} onOpenChange={setIsVitalsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Signos Vitales y Medidas</DialogTitle>
            <DialogDescription>Actualiza la información médica referencial del paciente.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sangre">Tipo de Sangre</Label>
                <Input id="sangre" placeholder="Ej. O+" value={vitalsData.sangre} onChange={(e) => setVitalsData({...vitalsData, sangre: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input id="peso" placeholder="Ej. 75" value={vitalsData.peso} onChange={(e) => setVitalsData({...vitalsData, peso: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input id="altura" placeholder="Ej. 175" value={vitalsData.altura} onChange={(e) => setVitalsData({...vitalsData, altura: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="presion">Presión Arterial</Label>
                <Input id="presion" placeholder="Ej. 120/80" value={vitalsData.presion} onChange={(e) => setVitalsData({...vitalsData, presion: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsVitalsDialogOpen(false)}>Cancelar</Button>
             <Button onClick={() => handleUpdateVitals()} disabled={isSubmitting} className="bg-blue-600">
               {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar Datos
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConsultaDialogOpen} onOpenChange={setIsConsultaDialogOpen}>
        <DialogContent className="sm:max-w-[600px] h-max max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Consulta (Formato SOAP)</DialogTitle>
            <DialogDescription>Completa el expediente clínico estructurado para esta consulta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Motivo de Consulta</Label>
               <Input 
                 placeholder="Ej. Dolor de cabeza persistente..."
                 value={consultaData.motivo}
                 onChange={(e) => setConsultaData({...consultaData, motivo: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <Label>Subjetivo (Síntomas y comentarios del paciente)</Label>
               <Textarea 
                 className="min-h-[80px]"
                 value={consultaData.subjetivo}
                 onChange={(e) => setConsultaData({...consultaData, subjetivo: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <Label>Objetivo (Exploración física y signos vitales comprobados)</Label>
               <Textarea 
                 className="min-h-[80px]"
                 value={consultaData.objetivo}
                 onChange={(e) => setConsultaData({...consultaData, objetivo: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <Label>Análisis / Diagnóstico (CIE-10 o descripción clínica)</Label>
               <Textarea 
                 className="min-h-[80px]"
                 value={consultaData.analisis}
                 onChange={(e) => setConsultaData({...consultaData, analisis: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <Label>Plan (Tratamiento, estudios, indicaciones)</Label>
               <Textarea 
                 className="min-h-[80px]"
                 value={consultaData.plan}
                 onChange={(e) => setConsultaData({...consultaData, plan: e.target.value})}
               />
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsConsultaDialogOpen(false)}>Cancelar</Button>
             <Button onClick={() => handleAddRecord("consulta")} disabled={isSubmitting} className="bg-blue-600">
               {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar Consulta
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNotaDialogOpen} onOpenChange={setIsNotaDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Nota Clínica</DialogTitle>
            <DialogDescription>Agrega una nota de evolución, diagnóstico o seguimiento.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <Textarea 
               placeholder="Escribe aquí los detalles clínicos..."
               className="min-h-[150px]"
               value={newContent}
               onChange={(e) => setNewContent(e.target.value)}
             />
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsNotaDialogOpen(false)}>Cancelar</Button>
             <Button onClick={() => handleAddRecord("nota")} disabled={isSubmitting} className="bg-blue-600">
               {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar Nota
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecetaDialogOpen} onOpenChange={setIsRecetaDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generar Nueva Receta</DialogTitle>
            <DialogDescription>Prescribe medicamentos e indicaciones.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <Textarea 
               placeholder="Medicamento, Dosis, Frecuencia, Duración..."
               className="min-h-[150px]"
               value={newContent}
               onChange={(e) => setNewContent(e.target.value)}
             />
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsRecetaDialogOpen(false)}>Cancelar</Button>
             <Button onClick={() => handleAddRecord("receta")} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
               {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Generar Receta
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content Tabs */}
      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 space-x-6">
          <TabsTrigger 
            value="resumen" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-3 px-1 font-medium"
          >
            Resumen Clínico
          </TabsTrigger>
          <TabsTrigger 
            value="notas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-3 px-1 font-medium"
          >
            Notas Clínicas
          </TabsTrigger>
          <TabsTrigger 
            value="recetas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-3 px-1 font-medium"
          >
            Recetas
          </TabsTrigger>
          <TabsTrigger 
            value="chat" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-3 px-1 font-medium flex items-center"
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Chat <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 rounded border-none">{messages.length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="resumen" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Vitals & Info */}
              <div className="space-y-6">
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold">Información Personal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Teléfono</p>
                      <p className="text-sm font-medium">{paciente.tel || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">RFC (Facturación)</p>
                      <p className="text-sm font-mono">{paciente.rfc || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader className="pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold">Signos Vitales</CardTitle>
                    {isDoctor && (
                      <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => {
                        setVitalsData({
                          sangre: paciente.sangre || "",
                          peso: paciente.peso || "",
                          altura: paciente.altura || "",
                          presion: paciente.presion || ""
                        });
                        setIsVitalsDialogOpen(true)
                      }}>
                        Editar
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Tipo de Sangre</p>
                        <p className="font-semibold text-rose-600">{paciente.sangre || "--"}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Peso</p>
                        <p className="font-semibold text-slate-900">{paciente.peso || "--"}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Altura</p>
                        <p className="font-semibold text-slate-900">{paciente.altura || "--"}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Presión Ref.</p>
                        <p className="font-semibold text-slate-900">{paciente.presion || "--"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Middle/Right Column: Timeline */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Historial Reciente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {records.length === 0 ? (
                      <p className="text-slate-500 text-sm">No hay registros recientes.</p>
                    ) : (
                      <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                        {records.slice(0, 5).map(record => (
                          <div className="relative" key={record.id}>
                            <span className={`absolute -left-[31px] p-1 rounded-full ring-4 ring-white ${record.type === 'nota' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {record.type === 'nota' ? <FileText className="h-3 w-3" /> : <Pill className="h-3 w-3" />}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                              <h4 className="text-sm font-semibold text-slate-900">{record.type === 'nota' ? 'Nota Clínica' : 'Receta Emitida'}</h4>
                              <span className="text-xs text-slate-500 font-mono">{new Date(record.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{record.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notas" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Historial de Consultas y Notas</h3>
              {isDoctor && (
                <div className="flex gap-2">
                  <Button onClick={() => setIsConsultaDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
                    <Activity className="mr-2 h-4 w-4" /> Nueva Consulta
                  </Button>
                  <Button variant="outline" onClick={() => setIsNotaDialogOpen(true)} className="rounded-xl shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Nota Simple
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {notas.length === 0 && records.filter(r => r.type === "consulta").length === 0 ? (
                <div className="text-center py-12 text-slate-500 border rounded-2xl bg-white border-slate-200">
                  No hay consultas ni notas registradas.
                </div>
              ) : (
                records.filter(r => r.type === "nota" || r.type === "consulta").map(nota => (
                  <Card key={nota.id} className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`bg-white p-2 rounded-lg border border-slate-200 shadow-sm ${nota.type === 'consulta' ? 'text-indigo-600' : 'text-blue-600'}`}>
                          {nota.type === 'consulta' ? <Activity className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{nota.type === 'consulta' ? 'Consulta Médica' : 'Nota Libre'}</h4>
                          <p className="text-xs text-slate-500">{new Date(nota.date).toLocaleString()}</p>
                        </div>
                      </div>
                      {nota.type === 'consulta' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-lg shadow-sm"
                          onClick={() => window.open(`/print/resumen/${user?.clinicId}/${id}/${nota.id}`, '_blank')}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Imprimir Resumen
                        </Button>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{nota.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="recetas" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-semibold text-slate-900">Recetario y Prescripciones</h3>
                  <p className="text-sm text-slate-500">Historial de recetas emitidas al paciente</p>
               </div>
               {isDoctor && (
                <Button onClick={() => setIsRecetaDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                  <FileDigit className="mr-2 h-4 w-4" /> Generar Receta
                </Button>
               )}
            </div>

            <div className="space-y-4">
              {recetas.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border rounded-2xl bg-white border-slate-200">
                  No hay recetas emitidas.
                </div>
              ) : (
                recetas.map(receta => (
                  <Card key={receta.id} className="rounded-2xl border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                         <Pill className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                         <h4 className="font-semibold text-slate-900">Receta</h4>
                         <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{receta.content}</p>
                         <p className="text-xs text-slate-400 mt-2">Emitida el {new Date(receta.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="shrink-0 text-slate-600 hover:text-blue-600 hover:border-blue-200" onClick={() => window.open(`/print/receta/${user?.clinicId}/${id}/${receta.id}`, '_blank')}>
                      Imprimir
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6 outline-none">
            <Card className="rounded-2xl border-slate-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-semibold">Mensajes con Paciente</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">El paciente puede ver estos mensajes en su portal.</p>
                  </div>
                  <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => window.open(`/portal/${user?.clinicId}/${id}`, '_blank')}>
                    Ver Portal del Paciente
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 border-b border-slate-100">
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-500 mt-10">
                      <p>No hay mensajes en este chat.</p>
                      <p className="text-sm mt-1">Envía un mensaje para iniciar la conversación.</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isDoctorMsg = msg.sender === 'doctor';
                      return (
                        <div key={msg.id} className={`flex ${isDoctorMsg ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                            isDoctorMsg 
                              ? 'bg-blue-600 text-white rounded-br-sm' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 bg-white flex gap-2">
                  <Input 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje al paciente..."
                    className="rounded-xl flex-1 bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                  />
                  <Button type="submit" disabled={!newMessage.trim()} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white w-12 h-10 p-0 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Modal: Cobrar Consulta / Servicio */}
      <Dialog open={isCobroOpen} onOpenChange={setIsCobroOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCobroSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-slate-900">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Registrar Cobro al Paciente
              </DialogTitle>
              <DialogDescription>
                Paciente: <span className="font-semibold text-slate-800">{paciente.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cobroMonto" className="text-slate-700 font-medium">Monto ($ MXN) *</Label>
                  <Input
                    id="cobroMonto"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={cobroData.monto}
                    onChange={(e) => setCobroData({...cobroData, monto: e.target.value})}
                    placeholder="800"
                    className="rounded-xl border-slate-200 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cobroMetodo" className="text-slate-700 font-medium">Método de Pago</Label>
                  <Select
                    value={cobroData.metodoPago}
                    onValueChange={(val) => setCobroData({...cobroData, metodoPago: val})}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta de Débito">Tarjeta Débito</SelectItem>
                      <SelectItem value="Tarjeta de Crédito">Tarjeta Crédito</SelectItem>
                      <SelectItem value="Transferencia SPEI">Transferencia SPEI</SelectItem>
                      <SelectItem value="Seguro Médico">Seguro Médico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cobroConcepto" className="text-slate-700 font-medium">Concepto</Label>
                <Select
                  value={cobroData.concepto}
                  onValueChange={(val) => setCobroData({...cobroData, concepto: val})}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Concepto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consulta Médica">Consulta Médica</SelectItem>
                    <SelectItem value="Consulta de Especialidad">Consulta de Especialidad</SelectItem>
                    <SelectItem value="Aplicación de Plasma (PRP)">Aplicación de Plasma (PRP)</SelectItem>
                    <SelectItem value="Infiltración / Bloqueo">Infiltración / Bloqueo</SelectItem>
                    <SelectItem value="Procedimiento / Curación">Procedimiento / Curación</SelectItem>
                    <SelectItem value="Medicamentos / Insumos">Medicamentos / Insumos</SelectItem>
                    <SelectItem value="Personalizado">Cobro Personalizado (Escribir concepto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {cobroData.concepto === "Personalizado" && (
                <div className="space-y-1.5 animate-in fade-in duration-200 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <Label htmlFor="cobroCustomConcept" className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Especificar Concepto Personalizado *
                  </Label>
                  <Input
                    id="cobroCustomConcept"
                    required
                    value={cobroData.customConcepto}
                    onChange={(e) => setCobroData({...cobroData, customConcepto: e.target.value})}
                    placeholder="Ej. Tratamiento de Plasma Rico en Plaquetas (PRP), Terapia neural..."
                    className="bg-white border-amber-200 rounded-lg text-sm"
                  />
                </div>
              )}

              {/* Opcional: Descontar de inventario */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-800">¿Descontar insumo de inventario?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !cobroData.descontarStock;
                      setCobroData({
                        ...cobroData,
                        descontarStock: next,
                        selectedInventoryId: (next && inventoryItems.length > 0 && !cobroData.selectedInventoryId) ? inventoryItems[0].id : cobroData.selectedInventoryId
                      });
                    }}
                    className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                      cobroData.descontarStock ? "bg-blue-600 text-white shadow-xs" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {cobroData.descontarStock ? "Sí, descontar" : "No"}
                  </button>
                </div>

                {cobroData.descontarStock && (
                  <div className="grid grid-cols-3 gap-2 pt-1 animate-in fade-in duration-200">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[11px] text-slate-600">Insumo / Fármaco</Label>
                      {inventoryItems.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No hay productos en stock.</p>
                      ) : (
                        <Select
                          value={cobroData.selectedInventoryId}
                          onValueChange={(val) => setCobroData({...cobroData, selectedInventoryId: val})}
                        >
                          <SelectTrigger className="rounded-lg h-9 bg-white text-xs border-slate-200">
                            <SelectValue placeholder="Seleccionar insumo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map(item => (
                              <SelectItem key={item.id} value={item.id} className="text-xs">
                                {item.nombre} (Stock: {item.cantidad})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Cant.</Label>
                      <Input
                        type="number"
                        min="1"
                        value={cobroData.descontarCantidad}
                        onChange={(e) => setCobroData({...cobroData, descontarCantidad: Math.max(1, parseInt(e.target.value) || 1)})}
                        className="rounded-lg h-9 bg-white text-xs border-slate-200 text-center font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cobroNotas" className="text-slate-700 font-medium">Notas / Referencia (Opcional)</Label>
                <Input
                  id="cobroNotas"
                  value={cobroData.notas}
                  onChange={(e) => setCobroData({...cobroData, notas: e.target.value})}
                  placeholder="Ej. Sesión 1 de 3 / Pagó en recepción"
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCobroOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar Cobro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
