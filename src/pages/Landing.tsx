import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Activity, 
  Shield, 
  Calendar, 
  CheckCircle2, 
  Smartphone, 
  Stethoscope,
  BarChart,
  Users,
  DollarSign,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

export default function Landing() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Si el usuario ya inició sesión previamente (es cliente/doctor), redirige automáticamente al Dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Vitela</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Módulos Clínicos</a>
              <a href="#benefits" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Beneficios</a>
              <a href="#seguridad" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Seguridad y Normativa</a>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm" render={<Link to="/dashboard" />} nativeButton={false}>
                  Ir a mi Clínica
                </Button>
              ) : (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-2" render={<Link to="/login" />} nativeButton={false}>
                  <LogIn className="w-4 h-4" /> Acceso al Sistema
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 text-center overflow-hidden relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-50"></div>
        <div className="max-w-4xl mx-auto space-y-8 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Plataforma Médica y Expediente Clínico Electrónico
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            El sistema operativo para tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">práctica médica</span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Expedientes clínicos, agenda de citas, recetas digitales, control de ingresos e inventario en una plataforma diseñada exclusivamente para consultorios y clínicas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200 group" render={<Link to="/dashboard" />} nativeButton={false}>
                Ir a mi Dashboard <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200 group" render={<Link to="/login" />} nativeButton={false}>
                <LogIn className="mr-2 w-5 h-5" /> Entrar al Sistema Clínico <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
          
          <p className="text-xs text-slate-500 mt-3 font-mono">
            Acceso directo para personal y médicos: guarda <span className="font-semibold text-slate-700">/login</span> o <span className="font-semibold text-slate-700">/acceso</span> en tus favoritos
          </p>
        </div>

        {/* Abstract Dashboard Mockup */}
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="relative rounded-t-3xl border-t border-l border-r border-slate-200/60 bg-white shadow-2xl overflow-hidden pt-4 px-4 h-[360px]">
            <div className="absolute top-0 left-0 right-0 h-14 bg-slate-50 border-b border-slate-100 flex items-center px-6 gap-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              <span className="text-xs text-slate-400 font-mono">vitela.app/dashboard</span>
            </div>
            <div className="mt-14 grid grid-cols-4 gap-6 opacity-40 mix-blend-multiply filter blur-[1px]">
               <div className="col-span-1 border-r border-slate-100 pr-6 space-y-4">
                  <div className="h-8 w-3/4 bg-slate-100 rounded"></div>
                  <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                  <div className="h-4 w-full bg-slate-100 rounded"></div>
                  <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
               </div>
               <div className="col-span-3 space-y-6">
                  <div className="h-24 w-full bg-slate-100 rounded-xl"></div>
                  <div className="grid grid-cols-3 gap-6">
                     <div className="h-28 bg-slate-100 rounded-xl"></div>
                     <div className="h-28 bg-slate-100 rounded-xl"></div>
                     <div className="h-28 bg-slate-100 rounded-xl"></div>
                  </div>
               </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-50 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-4">Todo lo que tu consultorio necesita</h2>
            <p className="text-lg text-slate-600">Reemplaza libretas y herramientas aisladas con una solución centralizada, rápida y conforme a normativas de salud.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Stethoscope className="w-6 h-6 text-blue-600" />}
              title="Expediente Clínico Electrónico"
              description="Historial médico completo, notas de evolución (SOAP), signos vitales y recetas digitales con código de verificación."
            />
            <FeatureCard 
              icon={<Calendar className="w-6 h-6 text-emerald-600" />}
              title="Agenda Inteligente"
              description="Control de citas por doctor, estados de consulta (programada, en espera, atendida) y portal de reserva en línea."
            />
            <FeatureCard 
              icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
              title="Control de Ingresos y Cobros"
              description="Registro ágil de pagos por consulta, tratamientos como plasma o procedimientos e insumos médicos, con reportes mensuales y exportación a Excel."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-rose-600" />}
              title="Máxima Seguridad"
              description="Diseñado bajo lineamientos de la NOM-004 y NOM-024. Los datos de la clínica están aislados, protegidos y respaldados."
            />
            <FeatureCard 
              icon={<BarChart className="w-6 h-6 text-amber-600" />}
              title="Inventario y Medicamentos"
              description="Control de stock de medicamentos, consumibles y kits con alerta de existencias mínimas y descuento automático al cobrar."
            />
            <FeatureCard 
              icon={<Smartphone className="w-6 h-6 text-sky-600" />}
              title="Portal para Pacientes"
              description="Tus pacientes pueden consultar sus recetas digitales, diagnósticos y próximas citas directamente desde su dispositivo."
            />
          </div>
        </div>
      </section>

      {/* Trust & compliance CTA */}
      <section id="seguridad" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Tu tranquilidad y la de tus pacientes es prioridad.</h2>
              <p className="text-slate-300 text-lg leading-relaxed">
                Nuestra arquitectura protege la privacidad de la información bajo los más estrictos controles de seguridad en la nube. La información de tu clínica te pertenece exclusivamente a ti.
              </p>
              <ul className="space-y-3 pt-4">
                {['Cumplimiento con NOM-024 y NOM-004 del expediente clínico', 'Encriptación de datos en tránsito y en reposo', 'Respaldos automáticos continuos en la nube', 'Roles de acceso diferenciados para médicos y asistentes'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
                    <span className="text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2 lg:pl-16 w-full">
               <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                  <Users className="w-12 h-12 text-blue-400 mb-6 relative z-10" />
                  <blockquote className="text-xl font-medium text-slate-200 leading-relaxed relative z-10">
                    "Centralizar las notas médicas, recetas y el control de cobros e inventario en un solo lugar redujo a la mitad el tiempo administrativo del consultorio."
                  </blockquote>
                  <div className="mt-8 relative z-10">
                    <div className="font-semibold text-white">Dr. Juan Carlos Méndez</div>
                    <div className="text-slate-400 text-sm">Médico Especialista</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Vitela</span>
          </div>
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Vitela Sistema Clínico. Todos los derechos reservados.
          </div>
          <div className="flex gap-6">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Acceso Médicos</Link>
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-900">Módulos</a>
            <a href="#seguridad" className="text-sm text-slate-500 hover:text-slate-900">Seguridad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300 group">
      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
