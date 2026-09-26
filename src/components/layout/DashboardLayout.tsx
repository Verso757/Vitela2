import { Link, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { 
  Activity, 
  Calendar, 
  Users, 
  FileText, 
  Settings, 
  Bell, 
  Search, 
  Menu, 
  ShieldAlert, 
  PieChart, 
  LogOut, 
  User as UserIcon, 
  Loader2, 
  Package, 
  Target, 
  DollarSign,
  ShieldCheck,
  Building2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../../contexts/AuthContext";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, loading, logout, isSuperAdmin, isImpersonating, activeClinicName, resetToMyClinic } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] text-slate-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm z-10">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">Vitela</span>
              {isSuperAdmin && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  SuperAdmin
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 mt-2 pb-4">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-slate-200">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 px-2 py-2 w-full text-left rounded-lg hover:bg-slate-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <Avatar className="h-9 w-9 border border-slate-100 shadow-sm bg-blue-100 text-blue-700">
                <AvatarFallback className="font-semibold">{user?.avatarInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium leading-none truncate text-slate-900">{user?.name}</span>
                <span className="text-xs text-slate-500 mt-1 truncate capitalize">
                  {isSuperAdmin ? "Super Admin SaaS" : user?.role === "doctor" ? "Doctor" : user?.role === "owner" ? "Propietario / Admin" : "Asistente"}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-lg border-slate-200">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isSuperAdmin && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="font-medium text-indigo-700 bg-indigo-50/60 focus:bg-indigo-100">
                    <ShieldCheck className="mr-2 h-4 w-4 text-indigo-600" />
                    <span>Panel Maestro SaaS</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Impersonation Banner for SuperAdmin */}
        {isImpersonating && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs md:text-sm font-medium flex flex-wrap items-center justify-between gap-2 shadow-sm border-b border-amber-600 shrink-0 z-20">
            <div className="flex items-center gap-2">
              <span className="bg-amber-900 text-amber-100 text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-wider shrink-0">
                Modo Soporte / Impersonación
              </span>
              <span>
                Administrando la clínica: <strong>{activeClinicName || "Clínica Cliente"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => navigate("/admin")} 
                className="h-7 text-xs bg-slate-900 text-white hover:bg-slate-800"
              >
                Ir al Panel Maestro
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={resetToMyClinic} 
                className="h-7 text-xs bg-white text-slate-900 hover:bg-amber-100 border-amber-400"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Volver a mi Consultorio
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden mr-2 text-slate-600" />}>
                  <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col justify-between">
                <div>
                  <div className="p-6 flex items-center gap-3 border-b border-slate-100">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">Vitela</span>
                      <span className="text-[11px] text-slate-400 font-medium">Clínica & Expediente</span>
                    </div>
                  </div>
                  <nav className="px-4 space-y-1 mt-4">
                    <NavLinks onClick={() => setSidebarOpen(false)} />
                  </nav>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9 border border-slate-200 shadow-sm bg-blue-100 text-blue-700">
                      <AvatarFallback className="font-semibold text-xs">{user?.avatarInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold text-slate-900 truncate">{user?.name}</span>
                      <span className="text-xs text-slate-500 truncate capitalize">
                        {isSuperAdmin ? "Super Admin SaaS" : user?.role === "owner" ? "Propietario / Admin" : user?.role}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 justify-center gap-2"
                    onClick={() => { setSidebarOpen(false); handleLogout(); }}
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden sm:flex relative w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar paciente, expediente o folio..."
                className="w-full bg-slate-50 pl-10 border-none focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg text-sm h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/admin")} 
                className="text-xs font-semibold bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hidden sm:flex items-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Panel Maestro
              </Button>
            )}

            <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 rounded-full hidden sm:flex" onClick={() => navigate("/configuracion")}>
              <Settings className="h-5 w-5" />
            </Button>
            
            {/* Mobile Profile avatar */}
            <div className="md:hidden ml-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center p-1 rounded-full hover:bg-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <Avatar className="h-8 w-8 border border-slate-200 shadow-sm bg-blue-100 text-blue-700">
                    <AvatarFallback className="font-semibold text-xs">{user?.avatarInitials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-slate-200">
                  <DropdownMenuLabel>
                    <div className="font-semibold text-slate-900 truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate capitalize">
                      {isSuperAdmin ? "Super Admin SaaS" : user?.role === "owner" ? "Propietario / Admin" : user?.role}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="font-medium text-indigo-700 bg-indigo-50/60 focus:bg-indigo-100">
                        <ShieldCheck className="mr-2 h-4 w-4 text-indigo-600" />
                        <span>Panel Maestro SaaS</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Perfil y Ajustes</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const location = useLocation();
  const { user, isSuperAdmin } = useAuth();
  
  const links = [
    { name: "Dashboard", path: "/dashboard", icon: Activity, roles: ["doctor", "assistant", "admin"] },
    { name: "Pacientes", path: "/pacientes", icon: Users, roles: ["doctor", "assistant", "admin"] },
    { name: "Agenda", path: "/agenda", icon: Calendar, roles: ["doctor", "assistant", "admin"] },
    { name: "Ingresos", path: "/ingresos", icon: DollarSign, roles: ["doctor", "assistant", "admin"] },
    { name: "Inventario", path: "/inventario", icon: Package, roles: ["doctor", "admin"] },
    { name: "Aseguradoras", path: "/aseguradoras", icon: ShieldAlert, roles: ["doctor", "admin"] },
    { name: "Reportes", path: "/reportes", icon: PieChart, roles: ["doctor", "admin"] },
    { name: "Configuración", path: "/configuracion", icon: Settings, roles: ["doctor", "admin"] },
  ];

  return (
    <div className="space-y-1 py-2">
      {/* Super Admin Master Link */}
      {isSuperAdmin && (
        <div className="mb-3 pb-2 border-b border-slate-100">
          <Link
            to="/admin"
            onClick={onClick}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold ${
              location.pathname.startsWith("/admin")
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`h-4.5 w-4.5 ${location.pathname.startsWith("/admin") ? "text-white" : "text-indigo-600"}`} />
              <span>Panel Maestro</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
              location.pathname.startsWith("/admin") ? "bg-white/20 text-white" : "bg-indigo-200/70 text-indigo-800"
            }`}>
              SaaS
            </span>
          </Link>
        </div>
      )}

      {links.map((link) => {
        if (user && !link.roles.includes(user.role) && user.role !== "owner") return null;
        
        const isActive = location.pathname.startsWith(link.path);
        const Icon = link.icon;
        
        return (
          <Link
            key={link.path}
            to={link.path}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium
              ${isActive 
                ? "bg-blue-50 text-blue-700 shadow-sm" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
            {link.name}
          </Link>
        );
      })}
    </div>
  );
}

