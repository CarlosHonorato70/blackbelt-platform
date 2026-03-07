import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSent(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email });
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
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Email Enviado
              </h1>
              <p className="text-gray-600 text-sm mb-6">
                Se o email estiver cadastrado, você receberá as instruções para
                redefinir sua senha. Verifique também a pasta de spam.
              </p>
              <Link to="/login">
                <Button
                  className="w-full h-12 text-white font-semibold rounded-lg"
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
                Recuperar Senha
              </h1>
              <p className="text-gray-600 text-sm text-center mb-6">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>

              {mutation.error && (
                <p className="text-red-600 text-sm text-center mb-4">
                  {mutation.error.message}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm text-gray-700 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
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
