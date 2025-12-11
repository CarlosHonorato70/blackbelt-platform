import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      setError("Email ou senha inválidos");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso!");
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      setError(error.message || "Erro ao criar conta");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({ email, password });
      } else {
        await registerMutation.mutateAsync({ email, password, name });
      }
    } catch (err) {
      // Erro já tratado
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(180deg, #4C1D95 0%, #5B21B6 50%, #6D28D9 100%)'
      }}
    >
      <div className="w-full max-w-md">
        {/* Card - Fundo Lavanda/Cinza Claro */}
        <div 
          className="rounded-2xl shadow-2xl p-10"
          style={{ backgroundColor: '#E9E3F0' }}
        >
          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
            {mode === "login" ? "Faça login na sua conta" : "Crie sua conta"}
          </h1>

          {/* Mensagem de Erro - Vermelho Brilhante */}
          {error && (
            <p className="text-red-600 text-sm text-center mb-6 font-medium">
              {error}
            </p>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {mode === "register" && (
              <Input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                required={mode === "register"}
                disabled={isLoading}
                className="h-12 rounded-lg border-gray-300 bg-white"
              />
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-300 bg-white"
            />

            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-300 bg-white"
            />

            <Button
              type="submit"
              className="w-full h-12 text-white font-semibold rounded-lg shadow-md"
              style={{ backgroundColor: '#7C3AED' }}
              disabled={isLoading}
            >
              {isLoading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-sm text-gray-700"
              disabled={isLoading}
            >
              {mode === "login" ? (
                <>
                  Primeira vez? <span className="font-bold">Cadastre-se</span>
                </>
              ) : (
                <>
                  Já tem conta? <span className="font-bold">Faça login</span>
                </>
              )}
            </button>

            {mode === "login" && (
              <div>
                <button
                  type="button"
                  className="text-sm text-blue-500 hover:text-blue-600"
                  disabled={isLoading}
                >
                  Recuperar Senha
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
