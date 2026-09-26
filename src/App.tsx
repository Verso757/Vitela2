import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import PacientesList from "./pages/PacientesList";
import Expediente from "./pages/Expediente";
import Agenda from "./pages/Agenda";
import ReservaPublica from "./pages/ReservaPublica";
import Facturacion from "./pages/Facturacion";
import Aseguradoras from "./pages/Aseguradoras";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import Inventario from "./pages/Inventario";
import Leads from "./pages/Leads";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import PortalPaciente from "./pages/PortalPaciente";
import RecetaPrint from "./pages/RecetaPrint";
import TicketPrint from "./pages/TicketPrint";
import ResumenPrint from "./pages/ResumenPrint";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/acceso" element={<Navigate to="/dashboard" replace />} />
          <Route path="/app" element={<Navigate to="/dashboard" replace />} />
          <Route path="/print/receta/:clinicId/:patientId/:recordId" element={<RecetaPrint />} />
          <Route path="/print/ticket/:clinicId/:invoiceId" element={<TicketPrint />} />
          <Route path="/print/resumen/:clinicId/:patientId/:recordId" element={<ResumenPrint />} />
          
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pacientes" element={<PacientesList />} />
            <Route path="pacientes/:id" element={<Expediente />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="ingresos" element={<Facturacion />} />
            <Route path="facturacion" element={<Facturacion />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="aseguradoras" element={<Aseguradoras />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="prospectos" element={<Leads />} />
          </Route>
          
          <Route path="/reserva/:doctorId" element={<ReservaPublica />} />
          <Route path="/portal/:clinicId/:patientId" element={<PortalPaciente />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
