import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Shield } from "lucide-react";

export default function Login() {
  usePageMeta({ title: "Entrar", description: "Acesse sua conta Black Belt Consultoria" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA state
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      if (data.requires2FA) {
        setTwoFactorToken(data.twoFactorToken);
        setShowTwoFactor(true);
        setError("");
        return;
      }
      toast.success("Login realizado com sucesso!");
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      setError(error.message || "Email ou senha invalidos");
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

  const verify2FAMutation = (trpc as any).auth.verify2FA.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      window.location.href = "/dashboard";
    },
    onError: (err: any) => {
      setError(err.message || "Codigo de verificacao invalido");
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
      // Erro ja tratado
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await verify2FAMutation.mutateAsync({
        token: twoFactorToken,
        code: twoFactorCode,
      });
    } catch (err) {
      // Erro ja tratado
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA verification screen
  if (showTwoFactor) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(180deg, #4C1D95 0%, #5B21B6 50%, #6D28D9 100%)'
        }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl shadow-2xl p-10"
            style={{ backgroundColor: '#E9E3F0' }}
          >
            <div className="flex flex-col items-center mb-6">
              <Shield className="h-12 w-12 text-purple-600 mb-3" />
              <h1 className="text-2xl font-bold text-gray-800 text-center">
                Verificacao em 2 Etapas
              </h1>
              <p className="text-sm text-gray-600 text-center mt-2">
                Digite o codigo do seu app autenticador ou um codigo de backup
              </p>
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center mb-6 font-medium">
                {error}
              </p>
            )}

            <form onSubmit={handle2FASubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Codigo de 6 digitos ou codigo de backup"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-lg border-gray-300 bg-white text-center text-lg tracking-widest"
                maxLength={12}
                autoFocus
              />

              <Button
                type="submit"
                className="w-full h-12 text-white font-semibold rounded-lg shadow-md hover:opacity-90"
                style={{ backgroundColor: '#7C3AED' }}
                disabled={isLoading}
              >
                {isLoading ? "Verificando..." : "Verificar"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowTwoFactor(false);
                  setTwoFactorToken("");
                  setTwoFactorCode("");
                  setError("");
                }}
                className="text-sm text-gray-700"
                disabled={isLoading}
              >
                Voltar ao login
              </button>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500 space-x-3">
              <Link to="/terms" className="hover:text-gray-700 underline">Termos de Uso</Link>
              <span>|</span>
              <Link to="/privacy" className="hover:text-gray-700 underline">Politica de Privacidade</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(180deg, #4C1D95 0%, #5B21B6 50%, #6D28D9 100%)'
      }}
    >
      <div className="w-full max-w-md">
        {/* Card - Fundo Lavanda/Cinza Claro EXATO DA IMAGEM */}
        <div
          className="rounded-2xl shadow-2xl p-10"
          style={{ backgroundColor: '#E9E3F0' }}
        >
          {/* Titulo */}
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
            {mode === "login" ? "Faca login na sua conta" : "Crie sua conta"}
          </h1>

          {/* Mensagem de Erro - Vermelho Brilhante */}
          {error && (
            <p className="text-red-600 text-sm text-center mb-6 font-medium">
              {error}
            </p>
          )}

          {/* Formulario */}
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
              className="w-full h-12 text-white font-semibold rounded-lg shadow-md hover:opacity-90"
              style={{ backgroundColor: '#7C3AED' }}
              disabled={isLoading}
            >
              {isLoading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          {/* Links EXATOS DA IMAGEM */}
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
                  Ja tem conta? <span className="font-bold">Faca login</span>
                </>
              )}
            </button>

            {mode === "login" && (
              <div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Recuperar Senha
                </Link>
              </div>
            )}
          </div>

          {/* Footer legal links */}
          <div className="mt-6 text-center text-xs text-gray-500 space-x-3">
            <Link to="/terms" className="hover:text-gray-700 underline">Termos de Uso</Link>
            <span>|</span>
            <Link to="/privacy" className="hover:text-gray-700 underline">Politica de Privacidade</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
