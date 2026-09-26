import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Download,
  CreditCard,
  Banknote,
  ArrowUpRight,
  Receipt,
  Trash2,
  Package,
  Sparkles,
  Printer
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface IngresoRecord {
  id: string;
  paciente: string;
  concepto?: string;
  monto: number;
  fecha: string;
  estado: string; // 'Pagado' | 'Pendiente' | 'Cancelado' | (legacy: 'Timbrada')
  metodoPago: string; // 'Efectivo' | 'Tarjeta de Débito' | 'Tarjeta de Crédito' | 'Transferencia SPEI' | 'Seguro'
  notas?: string;
  rfc?: string;
}

interface InventoryOption {
  id: string;
  nombre: string;
  cantidad: number;
  sku?: string;
}

export default function Facturacion() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [ingresos, setIngresos] = useState<IngresoRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New Income Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customConceptText, setCustomConceptText] = useState("");
  const [descontarStock, setDescontarStock] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [descontarCantidad, setDescontarCantidad] = useState(1);

  const [newIngreso, setNewIngreso] = useState({
    paciente: "",
    concepto: "Consulta Médica",
    monto: "",
    metodoPago: "Efectivo",
    estado: "Pagado",
    notas: ""
  });

  useEffect(() => {
    if (!user?.clinicId) return;

    // Load Invoices
    const q = query(collection(db, "clinics", user.clinicId, "invoices"));
    const unsubscribeInvoices = onSnapshot(q, (snapshot) => {
      const data: IngresoRecord[] = [];
      snapshot.forEach(d => {
        const item = d.data();
        data.push({
          id: d.id,
          paciente: item.paciente || "Paciente general",
          concepto: item.concepto || (item.usoCFDI ? "Honorarios médicos" : "Consulta"),
          monto: Number(item.monto) || 0,
          fecha: item.fecha || new Date().toISOString(),
          estado: item.estado === "Timbrada" ? "Pagado" : (item.estado || "Pagado"),
          metodoPago: item.metodoPago === "PUE" ? "Efectivo" : (item.metodoPago || "Efectivo"),
          notas: item.notas || "",
          rfc: item.rfc || ""
        });
      });
      data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setIngresos(data);
      setLoading(false);
    });

    // Load Inventory for item selection
    const qInv = query(collection(db, "clinics", user.clinicId, "inventory"));
    const unsubscribeInventory = onSnapshot(qInv, (snapshot) => {
      const items: InventoryOption[] = [];
      snapshot.forEach(d => {
        const it = d.data();
        items.push({
          id: d.id,
          nombre: it.nombre || "Sin nombre",
          cantidad: Number(it.cantidad) || 0,
          sku: it.sku || ""
        });
      });
      items.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setInventoryItems(items);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeInventory();
    };
  }, [user?.clinicId]);

  const handleAddIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId || !newIngreso.paciente.trim()) {
      toast.error("Por favor ingresa el nombre del paciente");
      return;
    }

    const montoNum = parseFloat(newIngreso.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("Por favor ingresa un monto válido");
      return;
    }

    const finalConcepto = newIngreso.concepto === "Personalizado (Escribir concepto)"
      ? (customConceptText.trim() || "Servicio / Tratamiento Especial")
      : newIngreso.concepto;

    try {
      setIsSubmitting(true);

      let finalNotas = newIngreso.notas.trim();

      // Descontar inventario si fue seleccionado
      if (descontarStock && selectedInventoryId) {
        const itemInv = inventoryItems.find(i => i.id === selectedInventoryId);
        if (itemInv) {
          const newQty = Math.max(0, itemInv.cantidad - descontarCantidad);
          await updateDoc(doc(db, "clinics", user.clinicId, "inventory", selectedInventoryId), {
            cantidad: newQty
          });
          const noteDesc = `Insumo descontado: ${itemInv.nombre} (x${descontarCantidad})`;
          finalNotas = finalNotas ? `${finalNotas} • ${noteDesc}` : noteDesc;
        }
      }

      const docRef = await addDoc(collection(db, "clinics", user.clinicId, "invoices"), {
        paciente: newIngreso.paciente.trim(),
        concepto: finalConcepto,
        monto: montoNum,
        fecha: new Date().toISOString(),
        estado: newIngreso.estado,
        metodoPago: newIngreso.metodoPago,
        notas: finalNotas
      });

      setIsDialogOpen(false);
      setNewIngreso({
        paciente: "",
        concepto: "Consulta Médica",
        monto: "",
        metodoPago: "Efectivo",
        estado: "Pagado",
        notas: ""
      });
      setCustomConceptText("");
      setDescontarStock(false);
      setSelectedInventoryId("");
      setDescontarCantidad(1);

      toast.success("Registro de ingreso guardado correctamente", {
        action: {
          label: "Imprimir Ticket",
          onClick: () => window.open(`/print/ticket/${user.clinicId}/${docRef.id}`, '_blank')
        }
      });
    } catch(err) {
      console.error(err);
      toast.error("Error al registrar el ingreso");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEstado = async (id: string, nuevoEstado: string) => {
    if (!user?.clinicId) return;
    try {
      await updateDoc(doc(db, "clinics", user.clinicId, "invoices", id), { estado: nuevoEstado });
      toast.success(`Estado actualizado a: ${nuevoEstado}`);
    } catch(err: any) {
      console.error(err);
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.clinicId) return;
    if (!window.confirm("¿Seguro que deseas eliminar este registro de ingreso?")) return;
    try {
      await deleteDoc(doc(db, "clinics", user.clinicId, "invoices", id));
      toast.success("Registro eliminado");
    } catch(err) {
      console.error(err);
      toast.error("Error al eliminar");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (ingresos.length === 0) {
      toast.info("No hay ingresos para exportar");
      return;
    }

    const headers = ["Fecha", "Paciente", "Concepto", "Método de Pago", "Monto", "Estado", "Notas"];
    const rows = ingresos.map(item => [
      new Date(item.fecha).toLocaleDateString('es-MX'),
      `"${item.paciente.replace(/"/g, '""')}"`,
      `"${(item.concepto || '').replace(/"/g, '""')}"`,
      `"${item.metodoPago}"`,
      item.monto.toFixed(2),
      item.estado,
      `"${(item.notas || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ingresos_clinica_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo Excel/CSV descargado");
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const ingresosMes = ingresos.filter(i => {
    const d = new Date(i.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (i.estado === "Pagado" || i.estado === "Timbrada");
  });

  const totalMes = ingresosMes.reduce((acc, curr) => acc + curr.monto, 0);
  const pendientesCount = ingresos.filter(i => i.estado === "Pendiente").length;
  const totalPendienteMonto = ingresos
    .filter(i => i.estado === "Pendiente")
    .reduce((acc, curr) => acc + curr.monto, 0);

  const filteredIngresos = ingresos.filter(item => {
    const matchSearch = 
      item.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.concepto && item.concepto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.metodoPago.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (filterEstado === "pagado") return item.estado === "Pagado" || item.estado === "Timbrada";
    if (filterEstado === "pendiente") return item.estado === "Pendiente";
    if (filterEstado === "cancelado") return item.estado === "Cancelado";
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Registro de Ingresos y Cobros
          </h1>
          <p className="text-slate-500 mt-1">Control simplificado de pagos de consultas, procedimientos y servicios clínicos.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            className="text-slate-700 bg-white shadow-sm border-slate-200 hover:bg-slate-50"
          >
            <Download className="mr-2 h-4 w-4" /> Exportar a Excel
          </Button>
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Registrar Ingreso
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-2xl p-5 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Ingresos del Mes</p>
              <h3 className="text-2xl font-bold text-slate-900">
                ${totalMes.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-emerald-600 mt-1 flex items-center font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> {ingresosMes.length} cobro{ingresosMes.length !== 1 ? 's' : ''} liquidado{ingresosMes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 border border-emerald-100">
              <Banknote className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl p-5 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Cobros Pendientes</p>
              <h3 className="text-2xl font-bold text-amber-600">
                {pendientesCount}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                ${totalPendienteMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} por cobrar
              </p>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600 border border-amber-100">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl p-5 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Histórico Registrado</p>
              <h3 className="text-2xl font-bold text-slate-900">{ingresos.length}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Transacciones registradas</p>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 border border-blue-100">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Buscar por paciente, concepto o método..."
              className="w-full bg-white pl-9 border-slate-200 focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 text-xs font-medium">
              <button
                onClick={() => setFilterEstado("todos")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filterEstado === "todos" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterEstado("pagado")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filterEstado === "pagado" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Pagados
              </button>
              <button
                onClick={() => setFilterEstado("pendiente")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filterEstado === "pendiente" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Pendientes
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-medium tracking-wider">Fecha</th>
                <th className="px-6 py-3.5 font-medium tracking-wider">Paciente</th>
                <th className="px-6 py-3.5 font-medium tracking-wider">Concepto</th>
                <th className="px-6 py-3.5 font-medium tracking-wider">Método de Pago</th>
                <th className="px-6 py-3.5 font-medium tracking-wider">Monto</th>
                <th className="px-6 py-3.5 font-medium tracking-wider">Estado</th>
                <th className="px-6 py-3.5 font-medium tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredIngresos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No se encontraron registros de ingresos.
                  </td>
                </tr>
              ) : (
                filteredIngresos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(item.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.paciente}</div>
                      {item.notas && <div className="text-xs text-slate-400 truncate max-w-xs">{item.notas}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {item.concepto || "Consulta médica"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {item.metodoPago.toLowerCase().includes("tarjeta") ? <CreditCard className="w-3 h-3 mr-1 text-slate-500"/> : <Banknote className="w-3 h-3 mr-1 text-slate-500"/>}
                        {item.metodoPago}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">
                        ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.estado === "Pagado" || item.estado === "Timbrada" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Pagado
                        </Badge>
                      ) : item.estado === "Pendiente" ? (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1 font-medium">
                          <Clock className="w-3 h-3" /> Pendiente
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 gap-1 font-medium">
                          <XCircle className="w-3 h-3" /> Cancelado
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/print/ticket/${user?.clinicId}/${item.id}`, '_blank')}
                          title="Imprimir Ticket de Cobro / Entrega"
                          className="h-8 px-2 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        >
                          <Printer className="w-3.5 h-3.5 sm:mr-1 text-slate-500" />
                          <span className="hidden sm:inline">Ticket</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg">
                            <span className="sr-only">Opciones</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200">
                            <DropdownMenuItem 
                              onClick={() => window.open(`/print/ticket/${user?.clinicId}/${item.id}`, '_blank')}
                              className="text-slate-700 font-medium cursor-pointer"
                            >
                              <Printer className="w-4 h-4 mr-2 text-emerald-600" /> Imprimir Ticket
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {item.estado !== "Pagado" && (
                              <DropdownMenuItem 
                                onClick={() => updateEstado(item.id, "Pagado")}
                                className="text-emerald-600 font-medium cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Pagado
                              </DropdownMenuItem>
                            )}
                            {item.estado !== "Pendiente" && (
                              <DropdownMenuItem 
                                onClick={() => updateEstado(item.id, "Pendiente")}
                                className="text-amber-600 cursor-pointer"
                              >
                                <Clock className="w-4 h-4 mr-2" /> Marcar Pendiente
                              </DropdownMenuItem>
                            )}
                            {item.estado !== "Cancelado" && (
                              <DropdownMenuItem 
                                onClick={() => updateEstado(item.id, "Cancelado")}
                                className="text-slate-600 cursor-pointer"
                              >
                                <XCircle className="w-4 h-4 mr-2" /> Cancelar Cobro
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item.id)}
                              className="text-rose-600 cursor-pointer focus:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Registrar Ingreso */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl">
          <form onSubmit={handleAddIngreso}>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 text-slate-900">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Registrar Nuevo Ingreso
              </DialogTitle>
              <DialogDescription>
                Registra el pago de una consulta, procedimiento o servicio médico.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="paciente" className="text-slate-700 font-medium">Paciente *</Label>
                <Input 
                  id="paciente"
                  required
                  value={newIngreso.paciente}
                  onChange={(e) => setNewIngreso({...newIngreso, paciente: e.target.value})}
                  placeholder="Nombre completo del paciente"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="monto" className="text-slate-700 font-medium">Monto ($ MXN) *</Label>
                  <Input 
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newIngreso.monto}
                    onChange={(e) => setNewIngreso({...newIngreso, monto: e.target.value})}
                    placeholder="Ej. 800"
                    className="rounded-xl border-slate-200 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="metodo" className="text-slate-700 font-medium">Método de Pago</Label>
                  <Select 
                    value={newIngreso.metodoPago} 
                    onValueChange={(val) => setNewIngreso({...newIngreso, metodoPago: val})}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta de Débito">Tarjeta de Débito</SelectItem>
                      <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                      <SelectItem value="Transferencia SPEI">Transferencia SPEI</SelectItem>
                      <SelectItem value="Seguro Médico">Seguro Médico</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="concepto" className="text-slate-700 font-medium">Concepto</Label>
                  <Select 
                    value={newIngreso.concepto} 
                    onValueChange={(val) => setNewIngreso({...newIngreso, concepto: val})}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Concepto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consulta Médica">Consulta Médica</SelectItem>
                      <SelectItem value="Consulta de Especialidad">Consulta de Especialidad</SelectItem>
                      <SelectItem value="Aplicación de Plasma (PRP)">Aplicación de Plasma (PRP)</SelectItem>
                      <SelectItem value="Infiltración / Bloqueo">Infiltración / Bloqueo</SelectItem>
                      <SelectItem value="Procedimiento / Curación">Procedimiento / Curación</SelectItem>
                      <SelectItem value="Medicamentos / Insumos">Medicamentos / Insumos</SelectItem>
                      <SelectItem value="Personalizado (Escribir concepto)">Personalizado (Escribir concepto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="estado" className="text-slate-700 font-medium">Estado inicial</Label>
                  <Select 
                    value={newIngreso.estado} 
                    onValueChange={(val) => setNewIngreso({...newIngreso, estado: val})}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pagado">Pagado</SelectItem>
                      <SelectItem value="Pendiente">Pendiente (Por cobrar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newIngreso.concepto === "Personalizado (Escribir concepto)" && (
                <div className="space-y-1.5 animate-in fade-in duration-200 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <Label htmlFor="customConcept" className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Nombre del Cobro / Procedimiento Personalizado *
                  </Label>
                  <Input
                    id="customConcept"
                    required
                    value={customConceptText}
                    onChange={(e) => setCustomConceptText(e.target.value)}
                    placeholder="Ej. Tratamiento de Plasma Rico en Plaquetas (PRP), Terapia neural..."
                    className="bg-white border-amber-200 rounded-lg text-sm"
                  />
                </div>
              )}

              {/* Sección Opcional: Descontar de Inventario */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-800">¿Descontar insumo o medicamento de inventario?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !descontarStock;
                      setDescontarStock(next);
                      if (next && inventoryItems.length > 0 && !selectedInventoryId) {
                        setSelectedInventoryId(inventoryItems[0].id);
                      }
                    }}
                    className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                      descontarStock 
                        ? "bg-blue-600 text-white shadow-xs" 
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {descontarStock ? "Sí, descontar" : "No (Solo cobrar)"}
                  </button>
                </div>

                {descontarStock && (
                  <div className="grid grid-cols-3 gap-2 pt-1 animate-in fade-in duration-200">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[11px] text-slate-600">Artículo de Farmacia / Insumos</Label>
                      {inventoryItems.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No hay productos en inventario.</p>
                      ) : (
                        <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                          <SelectTrigger className="rounded-lg h-9 bg-white text-xs border-slate-200">
                            <SelectValue placeholder="Seleccionar insumo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map(item => (
                              <SelectItem key={item.id} value={item.id} className="text-xs">
                                {item.nombre} (Stock: {item.cantidad})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Cantidad</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={descontarCantidad}
                        onChange={(e) => setDescontarCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                        className="rounded-lg h-9 bg-white text-xs border-slate-200 text-center font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notas" className="text-slate-700 font-medium">Notas / Referencia (Opcional)</Label>
                <Input 
                  id="notas"
                  value={newIngreso.notas}
                  onChange={(e) => setNewIngreso({...newIngreso, notas: e.target.value})}
                  placeholder="Ej. Recibo de honorarios, kit descartable incluido, terminal bancaria..."
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Guardar Ingreso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
