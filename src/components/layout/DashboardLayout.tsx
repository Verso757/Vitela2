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
  DollarSign
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
  const { user, loading, logout } = useAuth();

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
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <Activity className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Vitela</span>
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
                <span className="text-xs text-slate-500 mt-1 truncate capitalize">{user?.role === "doctor" ? "Doctor" : user?.role === "owner" ? "Propietario / Admin" : "Asistente"}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-lg border-slate-200">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden mr-2 text-slate-600" />}>
                  <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="p-6 flex items-center gap-3 border-b border-slate-100">
                  <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
                    <Activity className="h-6 w-6" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">Vitela</span>
                </div>
                <nav className="px-4 space-y-1 mt-4">
                  <NavLinks onClick={() => setSidebarOpen(false)} />
                </nav>
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
            <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 rounded-full hidden sm:flex" onClick={() => navigate("/configuracion")}>
              <Settings className="h-5 w-5" />
            </Button>
            
            {/* Mobile Profil avatar */}
            <div className="md:hidden ml-2">
               <Avatar className="h-8 w-8 border border-slate-100 shadow-sm bg-blue-100 text-blue-700">
                 <AvatarFallback className="font-semibold text-xs">{user?.avatarInitials}</AvatarFallback>
               </Avatar>
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
  const { user } = useAuth();
  
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
