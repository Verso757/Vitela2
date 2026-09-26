import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Lock, Mail, ChevronRight, Globe, AlertCircle, Check, Copy, ExternalLink, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import firebaseConfig from "../../firebase-applet-config.json";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHostingerHelp, setShowHostingerHelp] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const { user, loading, loginWithGoogle } = useAuth();
  
  React.useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;

  const handleCopyHost = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success("Dominio copiado al portapapeles");
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setUnauthorizedDomain(null);

    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (e: any) {
      console.error("Login error details:", e);
      const errorCode = e?.code || "";

      if (errorCode === "auth/unauthorized-domain") {
        setUnauthorizedDomain(currentHost);
        toast.error("Dominio no autorizado en Firebase", {
          description: `El dominio '${currentHost}' debe ser agregado en los dominios autorizados de Firebase Console.`,
          duration: 9000
        });
      } else if (errorCode === "auth/popup-blocked") {
        if (isInIframe) {
          toast.error("Abre la app en pestaña nueva", {
            description: "Por seguridad, el navegador bloquea ventanas emergentes de Google Auth dentro de un iframe (como el preview de AI Studio). Abre la app en una nueva pestaña.",
            duration: 8000
          });
        } else {
          toast.error("Ventana emergente bloqueada", {
            description: "Tu navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes para este sitio.",
            duration: 6000
          });
        }
      } else if (errorCode === "auth/popup-closed-by-user") {
        toast.info("Inicio de sesión cancelado", {
          description: "Cerraste la ventana de Google antes de finalizar.",
        });
      } else {
        if (isInIframe) {
          toast.error("Atención", {
            description: "Por seguridad de Google, si estás viendo la app dentro del visor de AI Studio, debes ABRIRLA EN UNA PESTAÑA NUEVA (icono de flecha arriba a la derecha).",
            duration: 8000
          });
        } else {
          toast.error("Error al iniciar sesión con Google", {
            description: e?.message || "Por favor intenta de nuevo.",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prompt to use Google Auth
    handleGoogleLogin();
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm">
            <Activity className="h-8 w-8" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-slate-900">Vitela</span>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Inicia sesión en tu clínica
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sistema de Gestión Médica & Expediente Clínico Digital
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Banner if inside an iframe */}
        {isInIframe && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Estás en la vista previa embebida</span>
              Para iniciar sesión con Google correctamente, abre la aplicación en una pestaña nueva con el botón de la esquina superior derecha del editor.
            </div>
          </div>
        )}

        {/* Detailed guide if unauthorized-domain error occurred */}
        {(unauthorizedDomain || showHostingerHelp) && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-semibold text-sm text-blue-950 mb-2">
              <Globe className="w-4 h-4 text-blue-600" />
              ¿Cómo autorizar tu dominio de Hostinger en Firebase?
            </div>
            <p className="text-blue-800 mb-3">
              Por seguridad, Firebase Authentication solo permite iniciar sesión con Google desde dominios que tú hayas autorizado.
            </p>
            <div className="bg-white border border-blue-200 rounded-lg p-2.5 mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Tu dominio actual</div>
                <div className="font-mono text-xs font-semibold text-slate-800 break-all">{currentHost || "tu-dominio.com"}</div>
              </div>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={handleCopyHost}
                className="h-8 gap-1.5 text-xs bg-slate-50 border-blue-200 hover:bg-blue-50 text-blue-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-blue-900 pl-1 text-[11px] mb-3">
              <li>Entra a la <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-0.5">Consola de Firebase <ExternalLink className="w-2.5 h-2.5" /></a></li>
              <li>Abre el proyecto: <span className="font-mono font-semibold bg-blue-100/70 px-1 py-0.5 rounded">{firebaseConfig.projectId}</span></li>
              <li>Ve a <strong>Authentication</strong> &rarr; pestaña <strong>Settings (Configuración)</strong> &rarr; <strong>Authorized domains (Dominios autorizados)</strong></li>
              <li>Haz clic en <strong>Add domain (Agregar dominio)</strong> y pega: <span className="font-mono font-semibold bg-blue-100/70 px-1 py-0.5 rounded">{currentHost || "tu-dominio.com"}</span></li>
            </ol>
            <p className="text-emerald-700 font-medium text-[11px]">
              ¡Listo! En cuanto lo guardes en Firebase, podrás hacer clic en "Continuar con Google" y entrará sin problemas.
            </p>
          </div>
        )}

        <Card className="border-slate-200 shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardContent className="pt-8 px-8 pb-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    autoComplete="email" 
                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 w-full" 
                    placeholder="doctor@clinica.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    autoComplete="current-password" 
                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 w-full" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={handleGoogleLogin}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-base shadow-sm group"
                  disabled={isLoading}
                >
                  {isLoading ? "Iniciando sesión..." : "Continuar con Google"} 
                  {!isLoading && <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowHostingerHelp(!showHostingerHelp)}
                  className="text-xs text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Subiste la app a Hostinger o tu propio dominio? Ver guía de acceso
                </button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex flex-col gap-1 items-center justify-center">
             <p className="text-xs text-slate-500 text-center font-medium">Plataforma Médica Vitela</p>
             <p className="text-[11px] text-slate-400 text-center">Protegido por encriptación y Firebase Authentication. Cumple con NOM-024 y HIPAA.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
