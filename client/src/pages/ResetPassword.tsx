import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres");
      return;
    }

    if (!token) {
      setError("Token inválido");
      return;
    }

    mutation.mutate({ token, password });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(180deg, #4C1D95 0%, #5B21B6 50%, #6D28D9 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl shadow-2xl p-10"
          style={{ backgroundColor: "#E9E3F0" }}
        >
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Senha Redefinida
              </h1>
              <p className="text-gray-600 text-sm mb-6">
                Sua senha foi alterada com sucesso. Faça login com sua nova
                senha.
              </p>
              <Link to="/login">
                <Button
                  className="w-full h-12 text-white font-semibold rounded-lg"
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  Ir para o Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
                Nova Senha
              </h1>
              <p className="text-gray-600 text-sm text-center mb-6">
                Digite sua nova senha abaixo.
              </p>

              {error && (
                <p className="text-red-600 text-sm text-center mb-4">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="password"
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={mutation.isPending}
                  className="h-12 rounded-lg border-gray-300 bg-white"
                />
                <Input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  disabled={mutation.isPending}
                  className="h-12 rounded-lg border-gray-300 bg-white"
                />
                <Button
                  type="submit"
                  className="w-full h-12 text-white font-semibold rounded-lg"
                  style={{ backgroundColor: "#7C3AED" }}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Nova Senha"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-gray-700">
                  Voltar ao Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
