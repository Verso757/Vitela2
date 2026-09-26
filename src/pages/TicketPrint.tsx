import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, CheckCircle, Receipt, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceData {
  paciente: string;
  concepto: string;
  monto: number;
  metodoPago: string;
  fecha: string;
  estado: string;
  notas?: string;
  cfdiFolio?: string;
}

interface ClinicData {
  name?: string;
  address?: string;
  rfc?: string;
  regimen?: string;
  contactEmail?: string;
  phone?: string;
}

export default function TicketPrint() {
  const { clinicId, invoiceId } = useParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!clinicId || !invoiceId) return;
      try {
        const [invSnap, clinicSnap] = await Promise.all([
          getDoc(doc(db, "clinics", clinicId, "invoices", invoiceId)),
          getDoc(doc(db, "clinics", clinicId))
        ]);

        if (invSnap.exists()) {
          setInvoice(invSnap.data() as InvoiceData);
        }
        if (clinicSnap.exists()) {
          setClinic(clinicSnap.data() as ClinicData);
        }
      } catch (err) {
        console.error("Error loading ticket:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [clinicId, invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <p className="text-slate-600 font-medium">Comprobante / Ticket no encontrado.</p>
        <Button onClick={() => window.close()} variant="outline" className="mt-4">
          Cerrar Ventana
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = invoice.fecha ? new Date(invoice.fecha) : new Date();
  const folio = invoice.cfdiFolio || `TK-${(invoiceId || "").slice(-6).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 print:py-0 print:bg-white text-slate-900 font-sans">
      {/* Control bar (hidden during print) */}
      <div className="max-w-md mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium"
        >
          <Printer className="w-4 h-4 mr-2" /> Imprimir Ticket
        </Button>
      </div>

      {/* Ticket Container (styled for standard 80mm thermal roll or centered 8.5x11) */}
      <div className="max-w-[360px] mx-auto bg-white p-6 rounded-2xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-2 print:max-w-full print:w-[320px] print:mx-auto">
        {/* Clinic Header */}
        <div className="text-center pb-4 border-b border-dashed border-slate-300">
          <div className="inline-flex p-2 rounded-full bg-emerald-50 text-emerald-600 mb-2 print:hidden">
            <Receipt className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
            {clinic?.name || "Clínica Médica"}
          </h1>
          {clinic?.address && (
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{clinic.address}</p>
          )}
          {clinic?.rfc && (
            <p className="text-xs text-slate-500 font-mono mt-0.5">RFC: {clinic.rfc}</p>
          )}
          {clinic?.contactEmail && (
            <p className="text-xs text-slate-500 mt-0.5">Contacto: {clinic.contactEmail}</p>
          )}
        </div>

        {/* Ticket Metainfo */}
        <div className="py-3 border-b border-dashed border-slate-300 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Folio:</span>
            <span className="font-mono font-bold text-slate-800">{folio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Fecha y Hora:</span>
            <span>
              {invoiceDate.toLocaleDateString("es-MX", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              {invoiceDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex justify-between items-start pt-1">
            <span className="text-slate-400 shrink-0">Paciente:</span>
            <span className="font-semibold text-slate-900 text-right">{invoice.paciente}</span>
          </div>
        </div>

        {/* Items / Concept Breakdown */}
        <div className="py-3 border-b border-dashed border-slate-300">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Detalle del Servicio / Entrega
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start text-sm">
              <span className="font-medium text-slate-800 leading-snug">
                {invoice.concepto || "Atención Médica"}
              </span>
              <span className="font-bold text-slate-900 font-mono shrink-0 ml-3">
                ${invoice.monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {invoice.notas && (
              <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 border border-slate-100 print:bg-transparent print:border-none print:p-0">
                <span className="font-medium text-slate-700">Detalle / Insumos: </span>
                <span>{invoice.notas}</span>
              </div>
            )}
          </div>
        </div>

        {/* Total & Payment Method */}
        <div className="py-3 border-b border-dashed border-slate-300 space-y-2 text-sm">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Método de Pago:</span>
            <span className="font-medium text-slate-800 uppercase">{invoice.metodoPago || "Efectivo"}</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-base font-bold text-slate-900 uppercase">Total Pagado:</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              ${invoice.monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">MXN</span>
            </span>
          </div>

          <div className="flex justify-center pt-2">
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:border-slate-800 print:text-slate-900 print:bg-transparent">
              <CheckCircle className="w-3.5 h-3.5" /> {invoice.estado === "Cancelado" ? "CANCELADO" : "PAGADO"}
            </span>
          </div>
        </div>

        {/* Friendly Footer */}
        <div className="pt-4 text-center text-xs text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-600">¡Gracias por su visita y confianza!</p>
          <p className="text-[11px] leading-tight">
            Comprobante simplificado de atención y entrega de insumos/medicamentos.
          </p>
          <p className="text-[10px] text-slate-400 pt-1">
            Si requiere factura fiscal CFDI, favor de solicitarla en recepción con sus datos fiscales.
          </p>
        </div>
      </div>
    </div>
  );
}
