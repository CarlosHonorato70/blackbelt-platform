import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { APP_TITLE, APP_LOGO } from "@/const";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso! Faça login.");
      setIsLogin(true);
      setEmail("");
      setPassword("");
      setName("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await loginMutation.mutateAsync({ email, password });
      } else {
        await registerMutation.mutateAsync({ email, password, name });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-16 rounded-lg" />
          </div>
          <div>
            <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
            <CardDescription>
              {isLogin ? "Faça login para continuar" : "Crie sua conta"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : isLogin ? "Entrar" : "Registrar"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isLogin ? (
              <>
                Não tem conta?{" "}
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-blue-600 hover:underline font-medium"
                  disabled={isLoading}
                >
                  Registre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-blue-600 hover:underline font-medium"
                  disabled={isLoading}
                >
                  Faça login
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
