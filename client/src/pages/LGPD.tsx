import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileText, Trash2, PenLine, CheckCircle, Loader2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { trpc } from "@/lib/trpc";

type RequestType = "export" | "delete" | "rectify";

const requestTypes: { value: RequestType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "export",
    label: "Acesso aos Dados",
    description: "Solicitar copia dos seus dados pessoais armazenados",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    value: "delete",
    label: "Exclusao de Dados",
    description: "Solicitar a exclusao dos seus dados pessoais",
    icon: <Trash2 className="w-5 h-5" />,
  },
  {
    value: "rectify",
    label: "Retificacao de Dados",
    description: "Solicitar correcao de dados pessoais incorretos",
    icon: <PenLine className="w-5 h-5" />,
  },
];

export default function LGPD() {
  usePageMeta({ title: "LGPD - Direitos do Titular" });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("export");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [error, setError] = useState("");

  const mutation = trpc.dataExport.publicDsr.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setProtocol(data.protocol);
    },
    onError: (err) => {
      setError(err.message || "Erro ao enviar solicitacao. Tente novamente.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate({ name, email, requestType, reason });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitacao Enviada</h2>
          <p className="text-gray-600 mb-4">
            Sua solicitacao foi registrada com sucesso. Responderemos no email informado em ate 15 dias uteis.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Protocolo</p>
            <p className="font-mono text-lg font-bold text-gray-900">{protocol}</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">LGPD - Direitos do Titular</h1>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Em conformidade com a <strong>Lei Geral de Protecao de Dados (Lei 13.709/2018)</strong>,
            você pode exercer seus direitos como titular de dados pessoais. Utilize o formulario
            abaixo para enviar sua solicitacao.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-blue-800">Art. 18, II</p>
              <p className="text-xs text-blue-600">Acesso aos dados</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-blue-800">Art. 18, VI</p>
              <p className="text-xs text-blue-600">Eliminacao de dados</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-blue-800">Art. 18, III</p>
              <p className="text-xs text-blue-600">Correcao de dados</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Formulario de Solicitacao</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Nome */}
          <div className="mb-5">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo *
            </label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Seu nome completo"
            />
          </div>

          {/* Email */}
          <div className="mb-5">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="seu@email.com"
            />
          </div>

          {/* Tipo de solicitacao */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de solicitacao *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {requestTypes.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setRequestType(rt.value)}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all ${
                    requestType === rt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  {rt.icon}
                  <span className="text-sm font-medium">{rt.label}</span>
                  <span className="text-xs text-center opacity-75">{rt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Motivo */}
          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Motivo / Detalhes *
            </label>
            <textarea
              id="reason"
              required
              minLength={10}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical"
              placeholder="Descreva sua solicitacao com detalhes..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Enviar Solicitacao
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Responderemos sua solicitacao em ate 15 dias uteis, conforme Art. 18, LGPD.
            Para duvidas, entre em contato:{" "}
            <a href="mailto:contato@blackbeltconsultoria.com" className="text-blue-600 hover:underline">
              contato@blackbeltconsultoria.com
            </a>
          </p>
        </form>

        {/* Links */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Politica de Privacidade
          </Link>
          <Link to="/terms" className="text-blue-600 hover:underline">
            Termos de Uso
          </Link>
        </div>
      </div>
    </div>
  );
}
