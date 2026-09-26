import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, Users, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function Reportes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);

  useEffect(() => {
    if (!user?.clinicId) return;

    // Fetch Invoices for Revenue
    const qInvoices = query(collection(db, "clinics", user.clinicId, "invoices"));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      let revenue = 0;
      const monthlyData: Record<string, { particular: number, aseguradoras: number }> = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.estado === "Timbrada" || data.estado === "Pagado") {
          revenue += (data.monto || 0);
          
          const month = new Date(data.fecha).toLocaleString('es-MX', { month: 'short' });
          if (!monthlyData[month]) monthlyData[month] = { particular: 0, aseguradoras: 0 };
          
          // Simplified simulation: if rfc looks like an individual, say particular, else aseguradora.
          if (data.rfc && data.rfc.length === 13) {
            monthlyData[month].particular += data.monto;
          } else {
            monthlyData[month].aseguradoras += data.monto;
          }
        }
      });
      
      setTotalRevenue(revenue);
      
      const formattedRevenue = Object.keys(monthlyData).map(k => ({
        name: k,
        particular: monthlyData[k].particular,
        aseguradoras: monthlyData[k].aseguradoras
      }));
      setRevenueData(formattedRevenue.length > 0 ? formattedRevenue : [{ name: "Este mes", particular: 0, aseguradoras: 0 }]);
    });

    // Fetch Patients
    const qPatients = query(collection(db, "clinics", user.clinicId, "patients"));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setTotalPatients(snapshot.size);
      
      let ranges = { "18-30 años": 0, "31-50 años": 0, "51-70 años": 0, "70+ años": 0 };
      snapshot.forEach(doc => {
         const edad = doc.data().edad || 35; // default 35
         if (edad <= 30) ranges["18-30 años"]++;
         else if (edad <= 50) ranges["31-50 años"]++;
         else if (edad <= 70) ranges["51-70 años"]++;
         else ranges["70+ años"]++;
      });
      
      const demo = Object.keys(ranges).map((k, i) => ({
        name: k,
        value: ranges[k as keyof typeof ranges],
        color: COLORS[i]
      })).filter(d => d.value > 0);
      
      setDemographicsData(demo.length > 0 ? demo : [{ name: "Sin datos", value: 1, color: "#cbd5e1" }]);
    });

    // Fetch Appointments for count
    const qAppointments = query(collection(db, "clinics", user.clinicId, "appointments"));
    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
       setTotalAppointments(snapshot.size);
       setLoading(false);
    });

    return () => {
      unsubInvoices();
      unsubPatients();
      unsubAppointments();
    };
  }, [user]);

  if (loading) {
    return <div className="flex p-10 justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reportes y Estadísticas</h1>
          <p className="text-slate-500 mt-1">Analítica sobre el rendimiento de tu práctica médica.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="6m">
            <SelectTrigger className="w-[140px] rounded-xl bg-white border-slate-200">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1m">Último mes</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="1y">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
               <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                  <DollarSign className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm font-medium text-slate-500">Ingresos Totales</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
               <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                  <Users className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm font-medium text-slate-500">Total Pacientes</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-2xl font-bold text-slate-900">{totalPatients}</h3>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
               <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                  <BarChart className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-sm font-medium text-slate-500">Consultas Agendadas</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-2xl font-bold text-slate-900">{totalAppointments}</h3>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Ingresos Históricos</CardTitle>
            <CardDescription>Comparación entre consulta particular y aseguradoras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(value) => `$${value/1000}k`} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="particular" name="Particular" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="aseguradoras" name="Aseguradoras" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Demographics Pie */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Demografía de Pacientes</CardTitle>
            <CardDescription>Distribución por grupos de edad</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                   <RechartsPieChart>
                      <Pie
                        data={demographicsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                         {demographicsData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                      </Pie>
                      <RechartsTooltip 
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                         itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} layout="vertical" verticalAlign="middle" align="right" />
                   </RechartsPieChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
