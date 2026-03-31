import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (err) => {
      setStatus("error");
      setErrorMessage(err.message || "Erro ao verificar email");
    },
  });

  const resendMutation = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: () => setResent(true),
  });
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token });
    } else {
      setStatus("waiting");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4C1D95] to-[#6D28D9] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {(status as string) === "waiting" && (
          <>
            <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-10 w-10 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verifique seu Email
            </h1>
            <p className="text-gray-500 mb-6">
              Enviamos um link de verificação para o seu email. Clique no link para ativar sua conta.
            </p>
            <button
              onClick={() => resendMutation.mutate()}
              disabled={resent || resendMutation.isPending}
              className="text-[#7C3AED] hover:underline font-medium disabled:opacity-50"
            >
              {resent ? "Email reenviado!" : resendMutation.isPending ? "Enviando..." : "Reenviar email de verificação"}
            </button>
            <div className="mt-4">
              <Link
                to="/login"
                className="text-sm text-gray-500 hover:underline"
              >
                Voltar para o Login
              </Link>
            </div>
          </>
        )}

        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 text-[#7C3AED] animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verificando Email...
            </h1>
            <p className="text-gray-500">
              Aguarde enquanto validamos seu endereço de email.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Email Verificado!
            </h1>
            <p className="text-gray-500 mb-6">
              Seu email foi verificado com sucesso. Agora você tem acesso completo à plataforma.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-[#7C3AED] text-white font-semibold rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Ir para o Dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verificação Falhou
            </h1>
            <p className="text-gray-500 mb-6">
              {errorMessage}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#7C3AED] text-white font-semibold rounded-lg hover:bg-[#6D28D9] transition-colors"
              >
                Ir para o Dashboard
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Mail className="h-4 w-4 mr-2" />
                Fazer Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
