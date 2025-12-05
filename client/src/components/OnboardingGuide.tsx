import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  Mail,
  Users,
  X,
  Eye,
  Download,
  Bell,
} from "lucide-react";
import { useState } from "react";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  actionText?: string;
  actionUrl?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Bem-vindo à Black Belt Consultoria",
    description:
      "Plataforma de Gestão de Riscos Psicossociais e Desenvolvimento Humano",
    icon: <Building2 className="h-12 w-12 text-yellow-600" />,
    details: [
      "Gestão completa de riscos psicossociais conforme NR-01",
      "Avaliações estruturadas de fatores de risco",
      "Relatórios de compliance e planos de ação",
      "Gestão de colaboradores e setores",
    ],
  },
  {
    id: 2,
    title: "Selecionando uma Empresa",
    description:
      "O primeiro passo é escolher a empresa com a qual você vai trabalhar",
    icon: <Building2 className="h-12 w-12 text-blue-600" />,
    details: [
      "Clique no botão 'Empresa selecionada' no sidebar esquerdo",
      "Um modal abrirá mostrando todas as empresas disponíveis",
      "Selecione a empresa desejada (ela ficará com checkmark verde)",
      "Clique em 'Confirmar Seleção' para confirmar",
      "Todas as páginas filtrarão dados dessa empresa automaticamente",
    ],
    actionText: "Ver seletor de empresa",
  },
  {
    id: 3,
    title: "Dashboard - Visão Geral",
    description: "Acompanhe indicadores e métricas da sua empresa",
    icon: <AlertCircle className="h-12 w-12 text-green-600" />,
    details: [
      "Visualize o número de empresas atendidas",
      "Acompanhe total de colaboradores cadastrados",
      "Veja quantidade de avaliações NR-01 realizadas",
      "Monitore programas ativos em andamento",
      "Gráficos de riscos por setor",
      "Indicadores de saúde mental e conformidade",
    ],
    actionText: "Ir para Dashboard",
    actionUrl: "/dashboard",
  },
  {
    id: 4,
    title: "Gestão de Setores",
    description: "Organize sua empresa em setores para melhor gestão de riscos",
    icon: <Users className="h-12 w-12 text-purple-600" />,
    details: [
      "Crie setores para cada departamento ou área",
      "Defina gestor responsável por cada setor",
      "Adicione descrição e características do setor",
      "Filtre dados por setor nas avaliações",
      "Acompanhe riscos específicos de cada setor",
    ],
    actionText: "Gerenciar Setores",
    actionUrl: "/sectors",
  },
  {
    id: 5,
    title: "Gestão de Colaboradores",
    description: "Cadastre e gerencie os colaboradores da sua empresa",
    icon: <Users className="h-12 w-12 text-cyan-600" />,
    details: [
      "Adicione novos colaboradores com cargo e setor",
      "Registre e-mail e telefone para contato",
      "Defina tipo de vínculo (próprio, terceirizado, etc)",
      "Acompanhe histórico de cada colaborador",
      "Integre com avaliações de riscos psicossociais",
    ],
    actionText: "Gerenciar Colaboradores",
    actionUrl: "/people",
  },
  {
    id: 6,
    title: "Avaliações NR-01",
    description: "Realize avaliações completas de riscos psicossociais",
    icon: <FileText className="h-12 w-12 text-orange-600" />,
    details: [
      "Crie novas avaliações de riscos psicossociais",
      "Identifique fatores de risco conforme guia MTE",
      "Avalie gravidade e probabilidade de cada risco",
      "Defina medidas de controle e mitigação",
      "Gere relatórios em PDF para documentação",
      "Acompanhe histórico de avaliações",
    ],
    actionText: "Criar Avaliação",
    actionUrl: "/risk-assessments/new",
  },
  {
    id: 7,
    title: "Relatórios de Compliance",
    description: "Gere relatórios de conformidade com a NR-01",
    icon: <FileText className="h-12 w-12 text-red-600" />,
    details: [
      "Visualize checklist de conformidade NR-01",
      "Acompanhe itens conformes e não conformes",
      "Crie planos de ação integrados",
      "Defina prazos para implementação de medidas",
      "Exporte relatórios em múltiplos formatos",
    ],
    actionText: "Ver Relatórios",
    actionUrl: "/compliance-reports",
  },
  {
    id: 8,
    title: "Sistema de Convites",
    description: "Convide colaboradores para usar a plataforma",
    icon: <Mail className="h-12 w-12 text-pink-600" />,
    details: [
      "Envie convites por e-mail para novos usuários",
      "Gerencie convites pendentes",
      "Acompanhe aceites e rejeições",
      "Resende convites se necessário",
      "Controle acesso de usuários",
    ],
    actionText: "Gerenciar Convites",
    actionUrl: "/user-invites",
  },
  {
    id: 9,
    title: "Perfis e Permissões",
    description: "Configure papéis e permissões de acesso",
    icon: <Lock className="h-12 w-12 text-indigo-600" />,
    details: [
      "Crie roles customizadas para sua organização",
      "Defina permissões granulares por função",
      "Atribua roles a colaboradores",
      "Controle acesso a funcionalidades específicas",
      "Acompanhe mudanças de perfil em auditoria",
    ],
    actionText: "Gerenciar Perfis",
    actionUrl: "/roles-permissions",
  },
  {
    id: 10,
    title: "Auditoria Visual",
    description: "Acompanhe todas as ações realizadas na plataforma",
    icon: <Eye className="h-12 w-12 text-slate-600" />,
    details: [
      "Visualize log completo de todas as ações",
      "Filtre por usuário, ação e data",
      "Veja detalhes de mudanças antes e depois",
      "Acompanhe IP e navegador de cada ação",
      "Exporte logs para análise externa",
    ],
    actionText: "Ver Auditoria",
    actionUrl: "/audit-logs",
  },
  {
    id: 11,
    title: "Exportação de Dados (LGPD)",
    description: "Gerencie direitos do titular de dados conforme LGPD",
    icon: <Download className="h-12 w-12 text-teal-600" />,
    details: [
      "Crie solicitações de exportação de dados",
      "Implemente direito ao esquecimento",
      "Retifique dados incorretos",
      "Exporte em múltiplos formatos (JSON, Excel, PDF)",
      "Acompanhe status de solicitações",
    ],
    actionText: "Gerenciar Exportação",
    actionUrl: "/data-export",
  },
  {
    id: 12,
    title: "Notificações",
    description: "Receba notificações de ações importantes",
    icon: <Bell className="h-12 w-12 text-amber-600" />,
    details: [
      "Centro de notificações no header da aplicação",
      "Receba alertas de avaliações completas",
      "Notificações de convites aceitos",
      "Alertas de solicitações DSR processadas",
      "Marque como lido ou delete notificações",
    ],
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

  const handleGoToStep = (stepId: number) => {
    setCurrentStep(stepId - 1);
  };

  const handleAction = () => {
    handleClose();
    if (step.actionUrl) {
      window.location.href = step.actionUrl;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
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

            <div className="flex gap-1 flex-wrap justify-center">
              {onboardingSteps.map((s, index) => (
                <Button
                  key={s.id}
                  variant={index === currentStep ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGoToStep(s.id)}
                  className="w-8 h-8 p-0"
                >
                  {index + 1}
                </Button>
              ))}
            </div>

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
                Parabéns! Você completou o guia de onboarding.
              </p>
              <p className="text-sm text-green-800 mt-1">
                Agora você está pronto para usar a plataforma Black Belt
                Consultoria!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
