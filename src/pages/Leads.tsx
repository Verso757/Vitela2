import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Users, 
  Search, 
  Trash2, 
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Briefcase
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "demo_requests"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: any[] = [];
      snapshot.forEach((doc) => {
        leadsData.push({ id: doc.id, ...doc.data() });
      });
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (user?.role !== "owner") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "demo_requests", id), { status: newStatus });
      toast.success("Estado actualizado");
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este prospecto?")) {
      try {
        await deleteDoc(doc(db, "demo_requests", id));
        toast.success("Prospecto eliminado");
      } catch (error) {
        console.error(error);
        toast.error("Error al eliminar");
      }
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(search.toLowerCase()) || 
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Posibles Clientes (Leads)
          </h1>
          <p className="text-slate-500 mt-1">Personas que han solicitado una demostración web.</p>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-slate-200"
            />
          </div>
          <Badge variant="secondary" className="w-fit">
            {filteredLeads.length} registros
          </Badge>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Prospecto</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">No hay prospectos.</td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      <div className="text-xs text-slate-500 flex items-center mt-1">
                        <Briefcase className="w-3 h-3 mr-1" /> {lead.clinic || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1 text-slate-600">
                        <span className="flex items-center text-xs"><Mail className="w-3 h-3 mr-1.5 object-contain" /> {lead.email}</span>
                        <span className="flex items-center text-xs"><Phone className="w-3 h-3 mr-1.5 object-contain" /> {lead.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {lead.createdAt ? format(lead.createdAt.toDate(), "dd MMM yyyy, HH:mm", { locale: es }) : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {lead.status === "contacted" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1"/> Contactado</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       {lead.status !== "contacted" && (
                         <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(lead.id, "contacted")} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                           Marcar Contactado
                         </Button>
                       )}
                       <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)} className="text-red-500 hover:bg-red-50 hover:text-red-600">
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
