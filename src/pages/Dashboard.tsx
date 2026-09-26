import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";

const data = [
  { name: "Lun", pacientes: 12 },
  { name: "Mar", pacientes: 19 },
  { name: "Mié", pacientes: 15 },
  { name: "Jue", pacientes: 22 },
  { name: "Vie", pacientes: 28 },
  { name: "Sáb", pacientes: 10 },
  { name: "Dom", pacientes: 4 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);

  useEffect(() => {
    if (!user?.clinicId) return;

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const apptQuery = query(
      collection(db, "clinics", user.clinicId, "appointments"),
      where("date", "==", dateString)
    );

    const unsubscribe = onSnapshot(apptQuery, async (snapshot) => {
      const fetchNamesPromises = snapshot.docs.map(async (d) => {
        const data = d.data();
        let paciente = "Desconocido";
        try {
          const ptDoc = await getDoc(doc(db, "clinics", user.clinicId, "patients", data.patientId));
          if (ptDoc.exists()) paciente = ptDoc.data().name;
        } catch(e) {}
        
        return {
          id: d.id,
          paciente,
          hora: data.time,
          tipo: data.type || 'Consulta',
          estado: data.status
        };
      });

      const resolvedAppts = await Promise.all(fetchNamesPromises);
      // sort by time
      resolvedAppts.sort((a,b) => a.hora.localeCompare(b.hora));
      setAppointments(resolvedAppts);
      setLoadingAppts(false);
    });

    const pendingRequestsQuery = query(
      collection(db, "clinics", user.clinicId, "public_requests"),
      where("status", "==", "pending")
    );

    const unsubscribeReqs = onSnapshot(pendingRequestsQuery, (snapshot) => {
      const reqs: any[] = [];
      snapshot.forEach(doc => {
        reqs.push({id: doc.id, ...doc.data()});
      });
      setPendingRequests(reqs);
    });

    // Fetch Total Patients
    const ptQuery = query(collection(db, "clinics", user.clinicId, "patients"));
    const unsubscribePts = onSnapshot(ptQuery, (snapshot) => {
       setTotalPatients(snapshot.size);
    });

    // Fetch Invoices for Revenue and Pending
    const invQuery = query(collection(db, "clinics", user.clinicId, "invoices"));
    const unsubscribeInv = onSnapshot(invQuery, (snapshot) => {
       let rev = 0;
       let pend = 0;
       const currentMonth = date.getMonth();
       const currentYear = date.getFullYear();
       
       snapshot.forEach(doc => {
          const data = doc.data();
          const dDate = new Date(data.fecha);
          if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
             if (data.estado === 'Timbrada' || data.estado === 'Pagado') rev += (data.monto || 0);
          }
          if (data.estado === 'Pendiente') pend++;
       });
       setMonthlyRevenue(rev);
       setPendingInvoices(pend);
    });

    return () => {
      unsubscribe();
      unsubscribeReqs();
      unsubscribePts();
      unsubscribeInv();
    };
  }, [user]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hola, {user?.name || 'Dr. Roberto'}</h1>
        <p className="text-slate-500 mt-1">Aquí está el resumen de tu día en la clínica.</p>
      </div>

      {pendingRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full p-2 text-white">
               <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Tienes {pendingRequests.length} nueva{pendingRequests.length > 1 ? 's' : ''} solicitud{pendingRequests.length > 1 ? 'es' : ''} de cita</h3>
              <p className="text-sm text-blue-700 mt-0.5">Pendiente{pendingRequests.length > 1 ? 's' : ''} de revisión desde el portal público.</p>
            </div>
          </div>
          <Link to="/agenda" className="bg-white text-blue-600 text-sm font-medium px-4 py-2 rounded-xl shadow-sm border border-blue-200 hover:bg-slate-50 transition-colors">
            Ver solicitudes
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Pacientes Hoy" 
          value={appointments.length.toString()} 
          trend="" 
          trendUp={true}
          icon={Calendar} 
          color="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Total Pacientes" 
          value={totalPatients.toString()} 
          trend="" 
          trendUp={true}
          icon={Users} 
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Ingresos del Mes" 
          value={`$${monthlyRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} 
          trend="" 
          trendUp={true}
          icon={TrendingUp} 
          color="bg-violet-50 text-violet-600"
        />
        <StatCard 
          title="Cobros Pendientes" 
          value={pendingInvoices.toString()} 
          trend="" 
          trendUp={false}
          icon={AlertCircle} 
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-slate-900">Flujo de Pacientes de la Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                  />
                  <Area type="monotone" dataKey="pacientes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPacientes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-slate-900">Citas de Hoy</CardTitle>
              <Link to="/agenda" className="text-sm font-medium text-blue-600 hover:text-blue-700">Ver todas</Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAppts ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-5 mt-2 max-h-[300px] overflow-y-auto pr-2">
                {appointments.map((cita) => (
                  <div key={cita.id} className="flex items-start gap-4">
                    <div className="w-14 text-center mt-0.5">
                      <div className="text-sm font-semibold text-slate-900">{cita.hora}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{cita.paciente}</p>
                      <p className="text-xs text-slate-500 truncate">{cita.tipo}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${cita.estado === 'confirmado' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}
                      `}>
                        {cita.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="py-10 text-center text-slate-500">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p>No hay citas programadas para hoy.</p>
               </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  trend, 
  trendUp, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            <span className={`text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>
              {trend}
            </span>
            <span className="text-xs text-slate-500 ml-2">vs. semana pasada</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
