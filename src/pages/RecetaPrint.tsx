import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RecetaPrint() {
  const { clinicId, patientId, recordId } = useParams();
  const [data, setData] = useState<any>(null);
  const [clinic, setClinic] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!clinicId || !patientId || !recordId) return;
      try {
        const [ptSnap, recSnap, clinicSnap] = await Promise.all([
          getDoc(doc(db, "clinics", clinicId, "patients", patientId)),
          getDoc(doc(db, "clinics", clinicId, "records", recordId)),
          getDoc(doc(db, "clinics", clinicId))
        ]);
        
        if (ptSnap.exists() && recSnap.exists()) {
          const recData = recSnap.data();
          setData({
            patient: ptSnap.data(),
            record: recData
          });

          if (recData.authorId) {
            try {
              const docSnap = await getDoc(doc(db, "users", recData.authorId));
              if (docSnap.exists()) {
                setDoctor(docSnap.data());
              }
            } catch (e) {
              console.error(e);
            }
          }
        }

        if (clinicSnap.exists()) {
          setClinic(clinicSnap.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [clinicId, patientId, recordId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <p className="text-slate-600">Registro de receta no encontrado.</p>
        <Button onClick={() => window.close()} variant="outline" className="mt-4">
          Cerrar
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const doctorName = doctor?.name
    ? `Dr. ${doctor.name} ${doctor.lastName || ""}`.trim()
    : "Médico Tratante";

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white text-slate-900 font-sans">
      {/* Control bar */}
      <div className="max-w-2xl mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.close()}
          className="text-slate-600 bg-white shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Cerrar
        </Button>
        <Button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium"
        >
          <Printer className="w-4 h-4 mr-2" /> Imprimir Receta
        </Button>
      </div>

      <div className="max-w-2xl mx-auto bg-white shadow-xl min-h-[850px] relative p-12 rounded-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:min-h-auto">
        
        {/* Receta Header */}
        <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">
              {clinic?.name || "Clínica Médica Integral"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">
              Recetario Médico Oficial
            </p>
            {clinic?.address && (
              <p className="text-xs text-slate-500 mt-1 max-w-xs">{clinic.address}</p>
            )}
          </div>
          <div className="text-right text-xs text-slate-600 space-y-1">
            <p className="font-bold text-sm text-slate-900">{doctorName}</p>
            {doctor?.specialty && <p>{doctor.specialty}</p>}
            {doctor?.cedulaProfesional && (
              <p className="font-mono text-[11px] text-slate-500">Cédula Prof: {doctor.cedulaProfesional}</p>
            )}
            {clinic?.contactEmail && <p>{clinic.contactEmail}</p>}
          </div>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm pb-6 border-b border-slate-200">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Paciente</span>
            <p className="text-lg font-bold text-slate-900 leading-snug">{data.patient.name}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fecha de Emisión</span>
            <p className="text-base font-medium text-slate-900 leading-snug">
              {new Date(data.record.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div>
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Edad / Sexo</span>
             <p className="text-slate-800 font-medium">{(data.patient.edad || "N/D")} años / {(data.patient.sexo || "N/D")}</p>
          </div>
          <div className="text-right">
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Signos Vitales</span>
             <p className="text-slate-800 font-medium">
               {data.patient.presion ? `PA: ${data.patient.presion}` : ''} {data.patient.peso ? `| ${data.patient.peso} kg` : ''}
               {!data.patient.presion && !data.patient.peso && 'N/D'}
             </p>
          </div>
        </div>

        {/* Rx Symbol */}
        <div className="mb-4">
          <span className="text-4xl font-serif font-black text-slate-800">Rx</span>
        </div>

        {/* Prescription content */}
        <div className="min-h-[300px] text-base leading-relaxed whitespace-pre-wrap text-slate-800 font-sans">
          {data.record.content}
        </div>

        {/* Footer info */}
        <div className="absolute bottom-12 left-12 right-12 border-t border-slate-300 pt-8 print:bottom-0">
          <div className="flex justify-between items-end text-xs">
             <div className="text-slate-500 max-w-xs space-y-1">
               <p className="italic">La presente receta médica tiene validez de 72 horas desde su expedición.</p>
               <p className="text-[11px] text-slate-400">Consulte a su médico ante cualquier reacción adversa o duda sobre su posología.</p>
             </div>
             <div className="text-center">
               <div className="w-52 border-b border-slate-800 mb-2"></div>
               <p className="font-bold text-slate-900">{doctorName}</p>
               <p className="text-[11px] text-slate-500 font-mono">Firma del Médico</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
