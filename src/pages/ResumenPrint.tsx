import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecordData {
  type: string;
  content: string;
  date: string;
  authorId?: string;
  patientId: string;
}

interface PatientData {
  name: string;
  edad?: number | string;
  sexo?: string;
  sangre?: string;
  peso?: string;
  altura?: string;
  presion?: string;
  tel?: string;
}

interface ClinicData {
  name?: string;
  address?: string;
  rfc?: string;
  contactEmail?: string;
}

interface DoctorData {
  name?: string;
  lastName?: string;
  specialty?: string;
  cedulaProfesional?: string;
  cedulaEspecialidad?: string;
}

export default function ResumenPrint() {
  const { clinicId, patientId, recordId } = useParams();
  const [record, setRecord] = useState<RecordData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!clinicId || !patientId || !recordId) return;
      try {
        const [recSnap, ptSnap, clinicSnap] = await Promise.all([
          getDoc(doc(db, "clinics", clinicId, "records", recordId)),
          getDoc(doc(db, "clinics", clinicId, "patients", patientId)),
          getDoc(doc(db, "clinics", clinicId))
        ]);

        if (recSnap.exists()) {
          const rData = recSnap.data() as RecordData;
          setRecord(rData);

          if (rData.authorId) {
            try {
              const docSnap = await getDoc(doc(db, "users", rData.authorId));
              if (docSnap.exists()) {
                setDoctor(docSnap.data() as DoctorData);
              }
            } catch (e) {
              console.error(e);
            }
          }
        }

        if (ptSnap.exists()) {
          setPatient(ptSnap.data() as PatientData);
        }

        if (clinicSnap.exists()) {
          setClinic(clinicSnap.data() as ClinicData);
        }
      } catch (err) {
        console.error("Error loading resumen:", err);
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

  if (!record || !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <p className="text-slate-600">Registro médico no encontrado.</p>
        <Button onClick={() => window.close()} variant="outline" className="mt-4">
          Cerrar
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const doctorFullName = doctor?.name
    ? `Dr. ${doctor.name} ${doctor.lastName || ""}`.trim()
    : "Médico Tratante";

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white text-slate-900 font-sans">
      {/* Control bar */}
      <div className="max-w-3xl mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
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
          <Printer className="w-4 h-4 mr-2" /> Imprimir Resumen Clínico
        </Button>
      </div>

      {/* Main Print Sheet */}
      <div className="max-w-3xl mx-auto bg-white shadow-xl min-h-[950px] relative p-10 rounded-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:min-h-auto">
        {/* Clinic & Doctor Header */}
        <div className="border-b-2 border-slate-800 pb-5 mb-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-6 h-6 text-blue-600 print:text-slate-900" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {clinic?.name || "Clínica Médica Integral"}
              </h1>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              Resumen de Consulta e Indicaciones Médicas
            </p>
            {clinic?.address && (
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{clinic.address}</p>
            )}
          </div>
          <div className="text-right text-xs text-slate-600 space-y-1">
            <p className="font-bold text-sm text-slate-900">{doctorFullName}</p>
            {doctor?.specialty && <p className="text-slate-600">{doctor.specialty}</p>}
            {doctor?.cedulaProfesional && (
              <p className="font-mono text-[11px] text-slate-500">
                Cédula Prof.: {doctor.cedulaProfesional}
              </p>
            )}
            {clinic?.contactEmail && <p>{clinic.contactEmail}</p>}
          </div>
        </div>

        {/* Patient Details & Vitals */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 text-xs print:bg-white print:border-slate-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px]">Paciente</span>
              <span className="font-bold text-sm text-slate-900">{patient.name}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px]">Fecha de Consulta</span>
              <span className="font-medium text-slate-800">
                {new Date(record.date).toLocaleDateString("es-MX", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px]">Edad / Sexo</span>
              <span className="font-medium text-slate-800">
                {patient.edad ? `${patient.edad} años` : "N/D"} / {patient.sexo || "N/D"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px]">Signos Vitales</span>
              <span className="font-medium text-slate-800">
                {patient.presion ? `PA: ${patient.presion}` : ""} {patient.peso ? `| ${patient.peso}kg` : ""}
                {!patient.presion && !patient.peso && "Regulares"}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-6 text-sm text-slate-800 min-h-[480px]">
          <div className="border border-slate-200 rounded-xl p-5 print:border-slate-300">
            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">
              Detalle de la Consulta y Evolución
            </h3>
            <div className="whitespace-pre-wrap leading-relaxed text-sm text-slate-800">
              {record.content}
            </div>
          </div>
        </div>

        {/* Signatures & Footer */}
        <div className="pt-8 border-t border-slate-300 mt-10 print:mt-12 text-xs">
          <div className="grid grid-cols-2 gap-8 items-end">
            <div className="text-slate-500">
              <p className="font-semibold text-slate-700">Instrucciones al Paciente:</p>
              <p className="mt-1 leading-relaxed text-[11px]">
                En caso de presentar signos de alarma o no presentar mejoría clínica en el plazo indicado, acuda de inmediato a valoración médica o servicio de urgencias.
              </p>
            </div>
            <div className="text-center">
              <div className="w-56 mx-auto border-b border-slate-800 mb-2"></div>
              <p className="font-bold text-slate-900">{doctorFullName}</p>
              <p className="text-[11px] text-slate-500 font-mono">Firma y Sello del Médico</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
