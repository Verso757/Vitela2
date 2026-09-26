import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { db } from "../lib/firebase";
import { collection, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";

const AVAILABLE_SLOTS = ["09:00", "09:30", "10:00", "11:30", "15:00", "16:00", "17:30"];

export default function ReservaPublica() {
  const { doctorId } = useParams();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [clinicName, setClinicName] = useState("Cargando...");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    reason: ""
  });

  useEffect(() => {
    async function loadClinic() {
      if (!doctorId) return;
      try {
        const docRef = doc(db, "clinics", doctorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setClinicName(docSnap.data().name);
        } else {
          setClinicName("Clínica no encontrada");
        }
      } catch (error) {
        console.error("Error loading clinic", error);
        setClinicName("Clínica Médica");
      }
    }
    loadClinic();
  }, [doctorId]);

  // Generate next 14 days
  const upcomingDays = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i));

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!doctorId || !selectedTime || !formData.name || !formData.phone) return;
      
      setLoading(true);
      try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        await addDoc(collection(db, "clinics", doctorId, "public_requests"), {
          name: formData.name,
          phone: formData.phone,
          reason: formData.reason || "Sin especificar",
          date: dateString,
          time: selectedTime,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        setStep(3);
      } catch (err) {
        console.error(err);
        alert("Ocurrió un error al procesar tu solicitud.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => setStep(step - 1);

  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-200 shadow-xl rounded-3xl text-center p-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl mb-2">¡Cita Solicitada!</CardTitle>
          <CardDescription className="text-base">
            Hemos recibido tu solicitud de cita médica. Pronto recibirás un mensaje validando la fecha y hora.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header (Branding for the clinic/doctor) */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto overflow-hidden shadow-sm border-4 border-white flex items-center justify-center text-blue-600 text-2xl font-bold">
            {clinicName.substring(0, 1)}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{clinicName}</h1>
          <p className="text-slate-500 font-medium text-sm">Reserva de Consultas</p>
        </div>

        <Card className="border-slate-200 shadow-lg rounded-3xl overflow-hidden bg-white">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex gap-2">
             <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
             <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          </div>

          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle className="text-xl">
              {step === 1 ? "Selecciona Fecha y Hora" : "Tus Datos"}
            </CardTitle>
            <CardDescription>
              {step === 1 ? "Elige el horario que mejor te acomode." : "Por favor, completa tus datos para agendar la cita."}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 py-4">
            {step === 1 && (
              <div className="space-y-8">
                {/* Dates Horizontal Scroll */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center"><CalendarIcon className="w-4 h-4 mr-2 text-slate-400" /> Fechas Disponibles</h3>
                  <div className="flex overflow-x-auto pb-4 -mx-6 px-6 gap-3 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {upcomingDays.map((day) => {
                      const isSelected = selectedDate.toDateString() === day.toDateString();
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={`snap-start shrink-0 w-[4.5rem] flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all
                            ${isSelected 
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                              : 'border-slate-100 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                            {format(day, 'EEE', { locale: es })}
                          </span>
                          <span className="text-xl font-bold">
                            {format(day, 'd', { locale: es })}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Times Grid */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center"><Clock className="w-4 h-4 mr-2 text-slate-400" /> Horarios de la mañana</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {AVAILABLE_SLOTS.filter(t => parseInt(t.split(':')[0]) < 12).map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors
                          ${selectedTime === time
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 mb-3 mt-6">Por la tarde</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {AVAILABLE_SLOTS.filter(t => parseInt(t.split(':')[0]) >= 12).map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors
                          ${selectedTime === time
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4 text-blue-900">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium opacity-80">Nueva Cita</p>
                    <p className="font-semibold">{format(selectedDate, "d 'de' MMMM", { locale: es })} a las {selectedTime}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input 
                      id="name" 
                      placeholder="Ej. Ana Pérez" 
                      className="h-11 rounded-xl bg-slate-50"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="Ej. 55 1234 5678" 
                      className="h-11 rounded-xl bg-slate-50"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                    <p className="text-xs text-slate-500 mt-1 pl-1">Por este medio confirmaremos la cita y mandaremos recordatorios.</p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reason">Motivo de la visita</Label>
                    <Textarea 
                      id="reason" 
                      placeholder="Cuéntanos brevemente qué te aqueja..." 
                      className="rounded-xl resize-none bg-slate-50" 
                      rows={3} 
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            {step === 2 && (
              <Button type="button" variant="outline" onClick={handleBack} className="rounded-xl h-12 px-4 shadow-sm bg-white" disabled={loading}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Button 
              type="button"
              className="flex-1 rounded-xl h-12 shadow-sm bg-blue-600 hover:bg-blue-700 text-white text-base"
              onClick={handleNext}
              disabled={(step === 1 && !selectedTime) || (step === 2 && (!formData.name || !formData.phone || loading))}
            >
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {step === 1 ? "Continuar con mis datos" : "Solicitar Cita"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
