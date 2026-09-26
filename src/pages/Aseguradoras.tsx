import React, { useState, useEffect } from "react";
import { ShieldAlert, Plus, Search, Filter, MoreHorizontal, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, addDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Aseguradora {
  id: string;
  nombre: string;
  estado: string;
}

export default function Aseguradoras() {
  const { user } = useAuth();
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.clinicId) return;
    
    const q = query(collection(db, "clinics", user.clinicId, "insurances"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: Aseguradora[] = [];
      snapshot.forEach(doc => docs.push({id: doc.id, ...doc.data()} as Aseguradora));
      setAseguradoras(docs);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId || !newNombre) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "clinics", user.clinicId, "insurances"), {
        nombre: newNombre,
        estado: "Activo"
      });
      setIsDialogOpen(false);
      setNewNombre("");
      toast.success("Aseguradora añadida");
    } catch(err) {
      console.error(err);
      toast.error("Error al añadir la aseguradora");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Gestión de Aseguradoras</h1>
          <p className="text-slate-500 mt-1">Administra tus convenios, tabuladores y cobranza a aseguradoras.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Convenio
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAdd}>
            <DialogHeader>
              <DialogTitle>Nueva Aseguradora</DialogTitle>
              <DialogDescription>
                Agrega una nueva aseguradora con la que tienes convenio.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Aseguradora</Label>
                <Input 
                  id="nombre"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej. GNP Seguros"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white lg:col-span-2">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between">
             <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Buscar aseguradora..."
                  className="w-full bg-slate-50 pl-9 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg"
                />
             </div>
             <Button variant="outline" className="rounded-lg text-slate-600">
                <Filter className="mr-2 h-4 w-4" /> Filtros
             </Button>
          </div>
          <div className="overflow-x-auto">
             {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
             ) : aseguradoras.length > 0 ? (
               <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-4 font-medium tracking-wider">Aseguradora</th>
                        <th className="px-6 py-4 font-medium tracking-wider text-center">Estado</th>
                        <th className="px-6 py-4 font-medium tracking-wider text-right"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {aseguradoras.map((aseguradora) => (
                        <tr key={aseguradora.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold bg-blue-100 text-blue-600`}>
                                    {aseguradora.nombre[0]}
                                 </div>
                                 <div className="font-semibold text-slate-900">{aseguradora.nombre}</div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <Badge variant="outline" className={aseguradora.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                                 {aseguradora.estado === 'Activo' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                 {aseguradora.estado}
                              </Badge>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg">
                                 <MoreHorizontal className="h-4 w-4" />
                              </Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
             ) : (
                <div className="p-10 text-center text-slate-500">
                  <p>No tienes aseguradoras configuradas.</p>
                </div>
             )}
          </div>
        </Card>

        <div className="space-y-6">
           <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                 <CardTitle className="text-base">Reclamos Pendientes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                  <div className="text-sm text-slate-500 text-center py-4">
                    Sin reclamos pendientes en este momento.
                  </div>
              </CardContent>
           </Card>

           <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-6 text-center">
               <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto mb-3" />
               <h3 className="text-sm font-semibold text-slate-900">Portal de Cobranza</h3>
               <p className="text-xs text-slate-500 mt-1 mb-4">Centraliza la comunicación y reclamaciones con las aseguradoras en un solo lugar.</p>
               <Button className="w-full bg-slate-900 text-white rounded-xl shadow-sm hover:bg-slate-800">Ir a Cobranza</Button>
           </Card>
        </div>
      </div>
    </div>
  );
}
