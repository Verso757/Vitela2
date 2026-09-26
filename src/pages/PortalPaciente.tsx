import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { User, MessageCircle, Send, Loader2, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, getDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";

interface Message {
  id: string;
  text: string;
  sender: 'patient' | 'doctor';
  createdAt: any;
}

export default function PortalPaciente() {
  const { clinicId, patientId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [patientName, setPatientName] = useState("Cargando...");
  const [patientData, setPatientData] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!clinicId || !patientId) return;
      try {
        const ptDoc = await getDoc(doc(db, "clinics", clinicId, "patients", patientId));
        if (ptDoc.exists()) {
          setPatientName(ptDoc.data().nombre || ptDoc.data().name);
          setPatientData(ptDoc.data());
        } else {
          setPatientName("Paciente Desconocido");
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();

    if (!clinicId || !patientId) return;
    
    // Load chat messages
    const q = query(
      collection(db, "clinics", clinicId, "patients", patientId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setLoading(false);
    });

    // Load medical records (Recetas)
    const recordsQ = query(collection(db, "clinics", clinicId, "records"));
    const unsubRecords = onSnapshot(recordsQ, (snapshot) => {
      const recs: any[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.patientId === patientId) {
          recs.push({id: d.id, ...data});
        }
      });
      // sort by date
      recs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(recs);
    });

    return () => {
      unsub();
      unsubRecords();
    };
  }, [clinicId, patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !clinicId || !patientId) return;

    try {
      await addDoc(collection(db, "clinics", clinicId, "patients", patientId, "messages"), {
        text: newMessage,
        sender: 'patient',
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <h1 className="sr-only">Portal del Paciente</h1>
      <header className="bg-white border-b border-slate-200 py-6 px-4 md:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Caja de Salud</h2>
            <p className="text-slate-500 text-sm">Bienvenido al portal de paciente, {patientName}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Info & Records */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><User className="w-5 h-5 mr-2 text-blue-600"/> Mis Datos</CardTitle>
            </CardHeader>
            <CardContent>
              {patientData ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-slate-500 block">Nombre Completo</span>
                    <span className="font-medium text-slate-900">{patientData.nombre || patientData.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Teléfono / Contacto</span>
                    <span className="font-medium text-slate-900">{patientData.tel || patientData.telefono || "No especificado"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sexo / Edad</span>
                    <span className="font-medium text-slate-900">{patientData.sexo || "N/A"} - {patientData.edad ? `${Math.floor((new Date().getTime() - new Date(patientData.edad).getTime()) / 31557600000)} años` : "N/A"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Datos no disponibles</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center"><Activity className="w-5 h-5 mr-2 text-indigo-600"/> Mis Recetas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {records.filter(r => r.type === "receta").length > 0 ? (
                  records.filter(r => r.type === "receta").map(receta => (
                    <div key={receta.id} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl relative">
                      <p className="text-xs text-indigo-400 mb-1">{new Date(receta.date).toLocaleDateString()}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{receta.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No hay recetas disponibles.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Chat */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-slate-200 shadow-sm flex flex-col h-[700px]">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center"><MessageCircle className="w-5 h-5 mr-2 text-slate-500"/> Chat con la Clínica</CardTitle>
              <CardDescription>Envía mensajes seguros a tu médico o asistentes.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                  <p>Inicia la conversación con la clínica.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                      msg.sender === 'patient' 
                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-2">
                <Input 
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-slate-50 rounded-xl border-slate-200 flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-6">
                  <Send className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
