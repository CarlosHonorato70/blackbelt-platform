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
      navigate("/dashboard");
    },
    onError: (error: any) => {
      setError("Email ou senha inválidos");
      toast.error(error.message || "Email ou senha inválidos");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-900 via-purple-700 to-purple-500 p-4">
      <div className="w-full max-w-md">
        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
            {mode === "login" ? "Faça login na sua conta" : "Crie sua conta"}
          </h1>

          {/* Mensagem de Erro */}
          {error && (
            <div className="text-red-600 text-sm text-center mb-4">
              {error}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <Input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                required={mode === "register"}
                disabled={isLoading}
                className="h-12 rounded-lg border-gray-300"
              />
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-300"
            />

            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-300"
            />

            <Button
              type="submit"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg"
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
              className="text-sm text-gray-600 hover:text-purple-600"
              disabled={isLoading}
            >
              {mode === "login" ? (
                <>
                  Primeira vez? <span className="text-purple-600 font-semibold">Cadastre-se</span>
                </>
              ) : (
                <>
                  Já tem conta? <span className="text-purple-600 font-semibold">Faça login</span>
                </>
              )}
            </button>

            {mode === "login" && (
              <div>
                <button
                  type="button"
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
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
