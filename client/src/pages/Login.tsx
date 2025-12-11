import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { APP_TITLE, APP_LOGO } from "@/const";
import { toast } from "sonner";

type AuthMode = "login" | "register";

interface LoginFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  isLoading: boolean;
  onSubmit: (data: any) => Promise<void>;
}

function LoginForm({
  mode,
  onModeChange,
  isLoading,
  onSubmit,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ email, password, name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Nome Completo
          </label>
          <Input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={e => setName(e.target.value)}
            required={mode === "register"}
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
          onChange={e => setEmail(e.target.value)}
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
          onChange={e => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? "Processando..."
          : mode === "login"
            ? "Entrar"
            : "Registrar"}
      </Button>

      <div className="space-y-2 text-center text-sm">
        {mode === "login" && (
          <div>
            Não tem conta?{" "}
            <button
              type="button"
              onClick={() => onModeChange("register")}
              className="text-blue-600 hover:underline font-medium"
              disabled={isLoading}
            >
              Registre-se
            </button>
          </div>
        )}

        {mode === "register" && (
          <div>
            <button
              type="button"
              onClick={() => onModeChange("login")}
              className="text-blue-600 hover:underline font-medium"
              disabled={isLoading}
            >
              Voltar para login
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard", { replace: true });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso!");
      navigate("/dashboard", { replace: true });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao registrar");
    },
  });

  const handleSubmit = async (data: {
    email: string;
    password: string;
    name: string;
  }) => {
    setIsLoading(true);
    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({
          email: data.email,
          password: data.password,
        });
      } else if (mode === "register") {
        await registerMutation.mutateAsync({
          email: data.email,
          password: data.password,
          name: data.name,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const title = useMemo(() => {
    switch (mode) {
      case "register":
        return "Crie sua conta";
      default:
        return "Faça login para continuar";
    }
  }, [mode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img
              src={APP_LOGO}
              alt={APP_TITLE}
              className="h-16 w-16 rounded-lg"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
            <CardDescription>{title}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <LoginForm
            mode={mode}
            onModeChange={setMode}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
