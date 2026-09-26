import React, { useState, useEffect } from "react";
import { Plus, Search, Package, AlertCircle, ArrowDownRight, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  nombre: string;
  sku: string;
  cantidad: number;
  minimo: number;
  categoria: string;
}

export default function Inventario() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para registrar salida / cobro
  const [isSalidaOpen, setIsSalidaOpen] = useState(false);
  const [salidaItem, setSalidaItem] = useState<InventoryItem | null>(null);
  const [salidaData, setSalidaData] = useState({
    cantidad: 1,
    motivo: "",
    crearIngreso: true,
    monto: "",
    metodoPago: "Efectivo"
  });

  const [newItem, setNewItem] = useState({
    nombre: "",
    sku: "",
    cantidad: "0",
    minimo: "10",
    categoria: "Medicamentos"
  });

  useEffect(() => {
    if (!user?.clinicId) return;

    const q = query(collection(db, "clinics", user.clinicId, "inventory"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: InventoryItem[] = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as InventoryItem);
      });
      setItems(results);
    });

    return () => unsubscribe();
  }, [user?.clinicId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId || !newItem.nombre) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "clinics", user.clinicId, "inventory"), {
        nombre: newItem.nombre,
        sku: newItem.sku,
        cantidad: parseInt(newItem.cantidad, 10) || 0,
        minimo: parseInt(newItem.minimo, 10) || 0,
        categoria: newItem.categoria,
        createdAt: serverTimestamp()
      });
      toast.success("Producto agregado exitosamente");
      setIsDialogOpen(false);
      setNewItem({ nombre: "", sku: "", cantidad: "0", minimo: "10", categoria: "Medicamentos" });
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStock = async (id: string, newQty: number) => {
    if (!user?.clinicId) return;
    try {
      await updateDoc(doc(db, "clinics", user.clinicId, "inventory", id), {
        cantidad: newQty
      });
      toast.success("Inventario actualizado");
    } catch (e) {
       toast.error("Error al actualizar stock");
    }
  };

  const handleOpenSalida = (item: InventoryItem) => {
    setSalidaItem(item);
    setSalidaData({
      cantidad: 1,
      motivo: "",
      crearIngreso: true,
      monto: "",
      metodoPago: "Efectivo"
    });
    setIsSalidaOpen(true);
  };

  const handleSalidaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.clinicId || !salidaItem) return;

    const qty = Math.max(1, Number(salidaData.cantidad) || 1);
    if (salidaItem.cantidad < qty) {
      toast.error(`Stock insuficiente. Solo quedan ${salidaItem.cantidad} unidades disponibles.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Descontar del inventario
      const newStock = Math.max(0, salidaItem.cantidad - qty);
      await updateDoc(doc(db, "clinics", user.clinicId, "inventory", salidaItem.id), {
        cantidad: newStock
      });

      // 2. Si se solicitó registrar cobro en Ingresos
      if (salidaData.crearIngreso && Number(salidaData.monto) > 0) {
        const invRef = await addDoc(collection(db, "clinics", user.clinicId, "invoices"), {
          paciente: salidaData.motivo.trim() || "Paciente general",
          concepto: `Venta de insumo / medicamento: ${salidaItem.nombre}`,
          monto: parseFloat(salidaData.monto),
          fecha: new Date().toISOString(),
          estado: "Pagado",
          metodoPago: salidaData.metodoPago,
          notas: `Descontado de farmacia (${qty} unidad/es de ${salidaItem.nombre})`
        });
        toast.success(`Salida registrada (-${qty}) y cobro guardado en Ingresos ($${salidaData.monto})`, {
          action: {
            label: "Imprimir Ticket",
            onClick: () => window.open(`/print/ticket/${user.clinicId}/${invRef.id}`, '_blank')
          }
        });
      } else {
        toast.success(`Salida de inventario registrada (-${qty} ${salidaItem.nombre})`);
      }

      setIsSalidaOpen(false);
      setSalidaItem(null);
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar la salida");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(i => 
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventario y Farmacia</h1>
          <p className="text-sm text-slate-500 mt-1">Gstiona el stock de medicamentos e insumos médicos.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Agregar Artículo
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código (SKU)..."
                className="pl-9 bg-white border-slate-200 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 w-[100px]">Stock</TableHead>
                <TableHead className="font-semibold text-slate-600">Artículo</TableHead>
                <TableHead className="font-semibold text-slate-600">Código/SKU</TableHead>
                <TableHead className="font-semibold text-slate-600">Categoría</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[200px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    No se encontraron artículos en inventario.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center">
                        <span className={`font-semibold ${
                          item.cantidad <= item.minimo ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          {item.cantidad}
                        </span>
                        {item.cantidad <= item.minimo && (
                           <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{item.nombre}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-xs">{item.sku || 'N/D'}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {item.categoria}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end items-center gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => handleOpenSalida(item)}
                           className="h-8 text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200"
                         >
                           <ArrowDownRight className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Salida / Cobro
                         </Button>
                         <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-white">
                           <button 
                             onClick={() => handleUpdateStock(item.id, Math.max(0, item.cantidad - 1))}
                             className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-medium"
                           >-</button>
                           <span className="px-2 text-sm w-8 text-center">{item.cantidad}</span>
                           <button 
                             onClick={() => handleUpdateStock(item.id, item.cantidad + 1)}
                             className="px-2 py-1 hover:bg-slate-100 text-slate-600 font-medium"
                           >+</button>
                         </div>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md border-white/10 rounded-2xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 py-6 border-b border-slate-100 bg-slate-50">
            <DialogTitle className="text-xl">Agregar Artículo</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddItem} className="px-6 py-4 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="nombre">Nombre del Producto / Medicamento</Label>
                <Input 
                  id="nombre"
                  required
                  value={newItem.nombre}
                  onChange={(e) => setNewItem({...newItem, nombre: e.target.value})}
                  className="rounded-xl border-slate-200"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku">Código o SKU</Label>
                <Input 
                  id="sku"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  className="rounded-xl border-slate-200 font-mono text-sm"
                  placeholder="OPCIONAL"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Input 
                  id="categoria"
                  required
                  value={newItem.categoria}
                  onChange={(e) => setNewItem({...newItem, categoria: e.target.value})}
                  className="rounded-xl border-slate-200"
                />
              </div>

               <div className="space-y-2">
                <Label htmlFor="cantidad">Stock Inicial</Label>
                <Input 
                  id="cantidad"
                  type="number"
                  required
                  min="0"
                  value={newItem.cantidad}
                  onChange={(e) => setNewItem({...newItem, cantidad: e.target.value})}
                  className="rounded-xl border-slate-200"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minimo">Alerta de Stock Mínimo</Label>
                <Input 
                  id="minimo"
                  type="number"
                  required
                  min="0"
                  value={newItem.minimo}
                  onChange={(e) => setNewItem({...newItem, minimo: e.target.value})}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                Guardar Artículo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Salida / Cobro de Medicamento o Insumo */}
      <Dialog open={isSalidaOpen} onOpenChange={setIsSalidaOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <DialogTitle className="text-xl flex items-center gap-2 text-slate-900">
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
              Salida / Venta de Insumo
            </DialogTitle>
            <DialogDescription>
              {salidaItem ? `${salidaItem.nombre} • Stock actual: ${salidaItem.cantidad} unidades` : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalidaSubmit} className="px-6 py-4 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="salidaCant" className="text-slate-700 font-medium">Cantidad a retirar *</Label>
                <Input
                  id="salidaCant"
                  type="number"
                  min="1"
                  max={salidaItem?.cantidad || 999}
                  required
                  value={salidaData.cantidad}
                  onChange={(e) => setSalidaData({...salidaData, cantidad: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="salidaMotivo" className="text-slate-700 font-medium">Paciente / Motivo</Label>
                <Input
                  id="salidaMotivo"
                  value={salidaData.motivo}
                  onChange={(e) => setSalidaData({...salidaData, motivo: e.target.value})}
                  placeholder="Ej. Juan Pérez / Uso en consulta"
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800">¿Registrar cobro en Ingresos?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSalidaData({...salidaData, crearIngreso: !salidaData.crearIngreso})}
                  className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                    salidaData.crearIngreso ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {salidaData.crearIngreso ? "Sí, cobrar" : "Solo salida física"}
                </button>
              </div>

              {salidaData.crearIngreso && (
                <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600 font-medium">Monto a cobrar ($ MXN) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      required={salidaData.crearIngreso}
                      value={salidaData.monto}
                      onChange={(e) => setSalidaData({...salidaData, monto: e.target.value})}
                      placeholder="Ej. 350"
                      className="rounded-lg h-9 bg-white text-xs border-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600 font-medium">Método de Pago</Label>
                    <Select
                      value={salidaData.metodoPago}
                      onValueChange={(val) => setSalidaData({...salidaData, metodoPago: val})}
                    >
                      <SelectTrigger className="rounded-lg h-9 bg-white text-xs border-slate-200">
                        <SelectValue placeholder="Método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo" className="text-xs">Efectivo</SelectItem>
                        <SelectItem value="Tarjeta de Débito" className="text-xs">Tarjeta Débito</SelectItem>
                        <SelectItem value="Tarjeta de Crédito" className="text-xs">Tarjeta Crédito</SelectItem>
                        <SelectItem value="Transferencia SPEI" className="text-xs">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsSalidaOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Salida
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
