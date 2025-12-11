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
      window.location.href = "/dashboard"; // Force reload para garantir cookie
    },
    onError: (error: any) => {
      setError("Email ou senha inválidos");
      toast.error("Email ou senha inválidos");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso!");
      window.location.href = "/dashboard"; // Force reload para garantir cookie
    },
    onError: (error: any) => {
      setError(error.message || "Erro ao criar conta");
      toast.error(error.message || "Erro ao criar conta");
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
      // Erro já tratado no onError
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 via-purple-700 to-purple-600 p-4">
      <div className="w-full max-w-md">
        {/* Card de Login - IDÊNTICO À IMAGEM */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
            {mode === "login" ? "Faça login na sua conta" : "Crie sua conta"}
          </h1>

          {/* Mensagem de Erro - VERMELHO BRILHANTE */}
          {error && (
            <p className="text-red-600 text-sm text-center mb-4">
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
                className="h-12 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />

            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />

            <Button
              type="submit"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          {/* Links - IDÊNTICOS À IMAGEM */}
          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-sm text-gray-700 hover:text-gray-900"
              disabled={isLoading}
            >
              {mode === "login" ? (
                <>
                  Primeira vez? <span className="text-purple-600 font-semibold underline">Cadastre-se</span>
                </>
              ) : (
                <>
                  Já tem conta? <span className="text-purple-600 font-semibold underline">Faça login</span>
                </>
              )}
            </button>

            {mode === "login" && (
              <div>
                <button
                  type="button"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium underline"
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
