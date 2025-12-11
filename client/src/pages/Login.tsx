import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type AuthMode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso!");
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao registrar");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({ email, password });
      } else {
        await registerMutation.mutateAsync({ email, password, name });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const title = useMemo(() => {
    return mode === "register" ? "Crie sua conta" : "Faça login para continuar";
  }, [mode]);

  const subtitle = useMemo(() => {
    return mode === "register" 
      ? "Preencha os dados abaixo para criar sua conta" 
      : "Entre com suas credenciais para acessar a plataforma";
  }, [mode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">BB</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Black Belt Consultoria</h1>
          <p className="text-gray-600">Plataforma de Gestão Empresarial</p>
        </div>

        {/* Card de Login/Registro */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
            <CardDescription className="text-center">{subtitle}</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nome Completo
                  </label>
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required={mode === "register"}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                disabled={isLoading}
              >
                {mode === "login" ? "Não tem conta? Registre-se" : "Já tem conta? Faça login"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2024 Black Belt Consultoria. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
