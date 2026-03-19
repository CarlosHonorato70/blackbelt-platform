import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  Users,
  X,
  Shield,
  Brain,
  ListChecks,
  UserCog,
  Briefcase,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  actionText?: string;
  actionUrl?: string;
  phase: "consultant" | "company";
}

const onboardingSteps: OnboardingStep[] = [
  // ── FASE 1: Configuração da Consultoria ──
  {
    id: 1,
    title: "Bem-vindo à Plataforma Black Belt",
    description:
      "Vamos configurar sua consultoria em poucos passos. Primeiro, configure seu perfil e depois gerencie suas empresas clientes.",
    icon: <Building2 className="h-12 w-12 text-yellow-600" />,
    details: [
      "Fase 1: Configure sua consultoria (perfil, segurança, plano)",
      "Fase 2: Gerencie empresas clientes (setores, colaboradores, avaliações)",
      "Use o Fluxo Guiado para acompanhar o progresso de cada empresa",
      "Ao final, exporte os 17 PDFs entregáveis para seu cliente",
    ],
    phase: "consultant",
  },
  {
    id: 2,
    title: "Seu Perfil e Plano",
    description:
      "Complete os dados da sua consultoria e escolha seu plano",
    icon: <UserCog className="h-12 w-12 text-blue-600" />,
    details: [
      "Verifique seus dados de login e perfil",
      "Escolha o plano adequado (Starter, Pro ou Enterprise)",
      "O plano define a quantidade de empresas clientes e recursos disponíveis",
      "Comece com 1 empresa gratis — sem limite de tempo",
    ],
    actionText: "Ver Meu Plano",
    actionUrl: "/subscription/pricing",
    phase: "consultant",
  },
  {
    id: 3,
    title: "Segurança da Conta",
    description:
      "Proteja sua conta com autenticação de dois fatores",
    icon: <Lock className="h-12 w-12 text-indigo-600" />,
    details: [
      "Ative a autenticação de dois fatores (2FA) para maior segurança",
      "Configure notificações de segurança",
      "Sua conta de consultor tem acesso a dados sensíveis dos clientes",
      "A segurança dos dados é fundamental para a conformidade LGPD",
    ],
    actionText: "Configurar Segurança",
    actionUrl: "/security-dashboard",
    phase: "consultant",
  },

  // ── FASE 2: Configuração da Empresa Cliente ──
  {
    id: 4,
    title: "Cadastrar Empresa Cliente",
    description:
      "Registre a empresa que contratou seus serviços de consultoria",
    icon: <Briefcase className="h-12 w-12 text-emerald-600" />,
    details: [
      "Acesse 'Minhas Empresas' no menu lateral",
      "Clique em 'Nova Empresa' e preencha os dados (CNPJ, razão social, contato)",
      "A empresa aparecerá na lista para seleção",
      "Selecione a empresa para começar a trabalhar nela",
      "Use a barra de seleção no sidebar para alternar entre empresas",
    ],
    actionText: "Minhas Empresas",
    actionUrl: "/companies",
    phase: "company",
  },
  {
    id: 5,
    title: "Criar Setores da Empresa",
    description:
      "Organize a empresa cliente em setores/departamentos",
    icon: <Building2 className="h-12 w-12 text-purple-600" />,
    details: [
      "Selecione a empresa cliente no sidebar",
      "Acesse 'Setores' e crie os departamentos da empresa",
      "Defina nome, descrição, turno e responsável de cada setor",
      "Os setores serão usados para vincular colaboradores e segmentar avaliações",
      "Exemplo: Produção, Administrativo, RH, Logística",
    ],
    actionText: "Gerenciar Setores",
    actionUrl: "/sectors",
    phase: "company",
  },
  {
    id: 6,
    title: "Cadastrar Colaboradores",
    description:
      "Adicione os colaboradores da empresa cliente",
    icon: <Users className="h-12 w-12 text-cyan-600" />,
    details: [
      "Acesse 'Colaboradores' e adicione cada pessoa",
      "Vincule ao setor correspondente",
      "Informe cargo, e-mail e telefone",
      "O e-mail é necessário para enviar o questionário COPSOQ-II",
      "Você pode importar colaboradores em massa via planilha Excel",
    ],
    actionText: "Gerenciar Colaboradores",
    actionUrl: "/people",
    phase: "company",
  },
  {
    id: 7,
    title: "Aplicar COPSOQ-II",
    description:
      "O questionário COPSOQ-II é o eixo central de toda a avaliação",
    icon: <Brain className="h-12 w-12 text-orange-600" />,
    details: [
      "Acesse 'COPSOQ-II' e crie uma nova avaliação",
      "Use 'Enviar Convites' para convidar os colaboradores por e-mail",
      "Cada colaborador recebe um link único para responder (sem login)",
      "São 76 questões em 6 seções, avaliando 12 dimensões psicossociais",
      "Acompanhe respostas em tempo real via 'Rastreamento'",
      "Ao concluir, gere o relatório COPSOQ com análise automática",
    ],
    actionText: "Criar Avaliação COPSOQ",
    actionUrl: "/copsoq",
    phase: "company",
  },
  {
    id: 8,
    title: "Avaliação de Riscos e Planos de Ação",
    description:
      "Registre os riscos identificados e defina ações corretivas",
    icon: <Shield className="h-12 w-12 text-red-600" />,
    details: [
      "Crie avaliação de riscos baseada nos resultados do COPSOQ-II",
      "Classifique cada risco por severidade e probabilidade",
      "Defina medidas de controle existentes e recomendadas",
      "Crie planos de ação com prazos e responsáveis",
      "A matriz de risco mostra uma visão consolidada",
    ],
    actionText: "Criar Avaliação de Risco",
    actionUrl: "/risk-assessments",
    phase: "company",
  },
  {
    id: 9,
    title: "Checklist NR-01 e Cronograma",
    description:
      "Verifique conformidade e configure o cronograma de implementação",
    icon: <FileText className="h-12 w-12 text-teal-600" />,
    details: [
      "O checklist NR-01 tem 22 requisitos obrigatórios pré-carregados",
      "Marque cada requisito como: Conforme, Parcial, Não Conforme",
      "Configure o cronograma com datas-alvo para cada etapa",
      "Quando o score atingir 80%, emita o Certificado de Conformidade",
      "Gere o laudo técnico com os dados do profissional responsável",
    ],
    actionText: "Ver Checklist",
    actionUrl: "/compliance-checklist",
    phase: "company",
  },
  {
    id: 10,
    title: "Fluxo Guiado e Entregáveis",
    description:
      "Use o fluxo guiado para acompanhar o progresso e exportar os PDFs",
    icon: <ListChecks className="h-12 w-12 text-yellow-600" />,
    details: [
      "Acesse 'Fluxo Guiado' no menu para ver todas as etapas",
      "O sistema verifica automaticamente quais etapas foram concluídas",
      "Na última etapa, exporte todos os 17 PDFs de uma vez",
      "Os PDFs incluem: Dashboard, Matriz de Risco, PCMSO, Laudo, Certificado...",
      "Entregue os PDFs ao cliente como documentação oficial da consultoria",
    ],
    actionText: "Abrir Fluxo Guiado",
    actionUrl: "/guided-workflow",
    phase: "company",
  },
];

interface OnboardingGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingGuide({ open, onOpenChange }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const consultantSteps = onboardingSteps.filter(s => s.phase === "consultant");
  const companySteps = onboardingSteps.filter(s => s.phase === "company");

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleGoToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleAction = () => {
    handleClose();
    if (step.actionUrl) {
      window.location.href = step.actionUrl;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={
                    step.phase === "consultant"
                      ? "border-blue-300 text-blue-700 bg-blue-50"
                      : "border-emerald-300 text-emerald-700 bg-emerald-50"
                  }
                >
                  {step.phase === "consultant"
                    ? "Fase 1: Sua Consultoria"
                    : "Fase 2: Empresa Cliente"}
                </Badge>
              </div>
              <DialogTitle className="text-2xl">{step.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {step.description}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Passo {currentStep + 1} de {onboardingSteps.length}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Phase indicator dots */}
            <div className="flex gap-1 justify-center">
              {onboardingSteps.map((s, index) => (
                <button
                  key={s.id}
                  onClick={() => handleGoToStep(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentStep
                      ? "bg-yellow-600 scale-125"
                      : s.phase === "consultant"
                        ? "bg-blue-200 hover:bg-blue-400"
                        : "bg-emerald-200 hover:bg-emerald-400"
                  }`}
                  title={s.title}
                />
              ))}
            </div>
          </div>

          {/* Ícone e Conteúdo */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">{step.icon}</div>
            <div className="flex-1 space-y-4">
              <ul className="space-y-3">
                {step.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            {step.actionText && step.actionUrl && (
              <Button onClick={handleAction} className="flex-1">
                <ArrowRight className="h-4 w-4 mr-2" />
                {step.actionText}
              </Button>
            )}
          </div>

          {/* Navegação */}
          <div className="flex gap-2 justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <Button
              onClick={handleNext}
              disabled={currentStep === onboardingSteps.length - 1}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Mensagem Final */}
          {currentStep === onboardingSteps.length - 1 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-900">
                Pronto! Agora acesse o Fluxo Guiado.
              </p>
              <p className="text-sm text-green-800 mt-1">
                O Fluxo Guiado acompanha o progresso de cada empresa e permite
                exportar todos os PDFs entregáveis.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
