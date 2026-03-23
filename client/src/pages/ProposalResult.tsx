/**
 * PROPOSAL RESULT PAGE
 *
 * Página pública que mostra o resultado da aprovação/recusa de proposta.
 * Acessada via redirect do backend após clicar no link do email.
 */

import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";

export default function ProposalResult() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  const configs: Record<string, { icon: any; title: string; message: string; color: string; bgColor: string }> = {
    approved: {
      icon: CheckCircle2,
      title: "Proposta Aprovada!",
      message: "Obrigado por aprovar a proposta comercial. Nossa equipe de consultoria entrara em contato para dar inicio ao processo de conformidade NR-01.",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    already_approved: {
      icon: CheckCircle2,
      title: "Proposta Ja Aprovada",
      message: "Esta proposta ja foi aprovada anteriormente. Nossa equipe esta trabalhando no seu processo.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    rejected: {
      icon: XCircle,
      title: "Proposta Recusada",
      message: "A proposta foi recusada. Se desejar discutir alternativas ou ajustes, entre em contato com nossa equipe.",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    invalid: {
      icon: AlertTriangle,
      title: "Link Invalido",
      message: "Este link de aprovacao nao e valido ou ja expirou. Entre em contato com o consultor responsavel.",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    error: {
      icon: AlertTriangle,
      title: "Erro ao Processar",
      message: "Ocorreu um erro ao processar sua resposta. Tente novamente ou entre em contato com a equipe.",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  };

  const config = configs[status || "error"] || configs.error;
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className={`${config.bgColor} rounded-2xl p-8 text-center shadow-lg`}>
          <Icon className={`h-16 w-16 mx-auto mb-4 ${config.color}`} />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>
          <p className="text-gray-600 mb-6">{config.message}</p>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">Black Belt Consultoria</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              contato@blackbeltconsultoria.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
