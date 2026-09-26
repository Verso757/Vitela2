import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, MoreHorizontal, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, addDoc } from "firebase/firestore";

interface Paciente {
  id: string;
  name: string;
  edad: number;
  sexo: string;
  tel: string;
  rfc?: string;
  ultimaCita?: string;
}

export default function PacientesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const [pacientesData, setPacientesData] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    edad: "",
    sexo: "M",
    tel: "",
    rfc: ""
  });

  useEffect(() => {
    if (!user || (!user.clinicId)) return;

    const patientsRef = collection(db, "clinics", user.clinicId, "patients");
    const q = query(patientsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Paciente[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Paciente);
      });
      setPacientesData(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredPacientes = pacientesData.filter(p => 
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId) return;
    try {
      setIsSubmitting(true);
      const patientsRef = collection(db, "clinics", user.clinicId, "patients");
      await addDoc(patientsRef, {
        name: newPatient.name,
        edad: parseInt(newPatient.edad) || 0,
        sexo: newPatient.sexo,
        tel: newPatient.tel,
        rfc: newPatient.rfc
      });
      setIsDialogOpen(false);
      setNewPatient({ name: "", edad: "", sexo: "M", tel: "", rfc: "" });
    } catch(e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Directorio de Pacientes</h1>
          <p className="text-slate-500 mt-1">Gestiona los expedientes clínicos y la información de contacto.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <form onSubmit={handleAddPatient}>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo paciente para crear su expediente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input 
                  id="nombre" 
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edad">Edad</Label>
                  <Input 
                    id="edad" 
                    type="number"
                    value={newPatient.edad}
                    onChange={(e) => setNewPatient({...newPatient, edad: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <select 
                    id="sexo"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newPatient.sexo}
                    onChange={(e) => setNewPatient({...newPatient, sexo: e.target.value})}
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel">Teléfono</Label>
                <Input 
                  id="tel" 
                  value={newPatient.tel}
                  onChange={(e) => setNewPatient({...newPatient, tel: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC (Opcional)</Label>
                <Input 
                  id="rfc" 
                  value={newPatient.rfc}
                  onChange={(e) => setNewPatient({...newPatient, rfc: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between bg-white">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Buscar por nombre, ID o RFC..."
              className="w-full bg-slate-50 pl-9 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-lg text-slate-600">
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto bg-white min-h-[300px]">
          {loading ? (
             <div className="flex items-center justify-center h-full pt-16">
               <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
             </div>
          ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Paciente</th>
                <th className="px-6 py-4 font-medium tracking-wider hidden md:table-cell">ID / RFC</th>
                <th className="px-6 py-4 font-medium tracking-wider">Teléfono</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPacientes.map((paciente) => (
                <tr key={paciente.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-200 bg-slate-100 text-slate-600">
                        <AvatarFallback>{paciente.name ? paciente.name.substring(0, 2).toUpperCase() : '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link to={`/pacientes/${paciente.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition-colors block">
                          {paciente.name}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5">{paciente.edad} años • {paciente.sexo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="text-slate-900 font-mono text-xs">{paciente.id.substring(0,8)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{paciente.rfc || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {paciente.tel}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="hidden sm:flex text-blue-600 hover:text-blue-700 hover:bg-blue-50" render={<Link to={`/pacientes/${paciente.id}`} />} nativeButton={false}>
                           <FileText className="mr-2 h-4 w-4" />
                           Expediente
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200">
                          <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                          <DropdownMenuItem render={<Link to={`/pacientes/${paciente.id}`} className="cursor-pointer w-full" />}>
                            Ver Expediente
                          </DropdownMenuItem>
                          <DropdownMenuItem>Agendar Cita</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            const url = window.location.origin + `/portal/${user.clinicId}/${paciente.id}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link del portal copiado al portapapeles");
                          }}>
                            Copiar link del Portal
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/portal/${user?.clinicId}/${paciente.id}`, '_blank')}>
                            Ver Portal del Paciente
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user?.role === "owner" && (
                            <DropdownMenuItem>Generar Receta</DropdownMenuItem>
                          )}
                          <DropdownMenuItem>Emitir Factura</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          {!loading && filteredPacientes.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No se encontraron pacientes con ese criterio de búsqueda.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
