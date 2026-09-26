import * as React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Lock, Mail, ChevronRight, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading, loginWithGoogle } = useAuth();
  
  React.useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm">
            <Activity className="h-8 w-8" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-slate-900">Vitela</span>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          Inicia sesión en tu cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          O{" "}
          <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
            comienza tu prueba gratuita de 14 días
          </a>
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="pt-8 px-8 pb-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    autoComplete="email" 
                    required 
                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 w-full" 
                    placeholder="dr.roberto@clinica.com"
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
                    required 
                    className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 w-full" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  type="button" 
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await loginWithGoogle();
                      navigate("/dashboard");
                    } catch (e: any) {
                      console.error(e);
                      if (e.message === "popup-closed") {
                        toast.error("Atención", {
                           description: "Por seguridad de Google, si estás viendo The AI Studio, debes ABRIR ESTA APP EN UNA PESTAÑA NUEVA (icono arriba a la derecha) para poder iniciar sesión.",
                           duration: 8000
                        });
                      } else {
                        toast.error("Error al iniciar sesión con Google.");
                      }
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-base shadow-sm group"
                  disabled={isLoading}
                >
                  {isLoading ? "Iniciando sesión..." : "Continuar con Google"} 
                  {!isLoading && <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-center">
             <p className="text-xs text-slate-500 text-center">Protegido por encriptación de grado militar. Cumple con NOM-024 y HIPAA.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
