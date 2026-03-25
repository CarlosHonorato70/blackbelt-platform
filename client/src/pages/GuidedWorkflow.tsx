import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ChevronRight,
  Download,
  FileText,
  ClipboardList,
  Calendar,
  Target,
  Award,
  Loader2,
  ExternalLink,
  Brain,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface StepStatus {
  completed: boolean;
  hasData: boolean;
  count?: number;
  detail?: string;
}

export default function GuidedWorkflow() {
  const { selectedTenant } = useTenant();
  const { data: user } = trpc.auth.me.useQuery();
  const effectiveId = (typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id) || user?.tenantId;
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [exportingPdfs, setExportingPdfs] = useState(false);
  const [pdfResults, setPdfResults] = useState<
    { name: string; status: "ok" | "fail" | "pending"; size?: number }[]
  >([]);

  // Queries to check data status for each step
  const { data: copsoqSummary, isLoading: loadingCopsoq } =
    trpc.psychosocialDashboard.getSummary.useQuery(
      { tenantId: effectiveId || "" },
      { enabled: !!effectiveId }
    );

  const { data: actionPlansData } = trpc.riskAssessments.listActionPlans.useQuery(
    { tenantId: selectedTenant?.id || "" },
    { enabled: !!selectedTenant }
  );

  const { data: checklistData } = trpc.complianceChecklist.list.useQuery(
    { tenantId: selectedTenant?.id || "" },
    { enabled: !!selectedTenant }
  );

  const { data: timelineData } = trpc.complianceTimeline.list.useQuery(
    { tenantId: selectedTenant?.id || "" },
    { enabled: !!selectedTenant }
  );

  const { data: riskAssessments } = trpc.riskAssessments.list.useQuery(
    { tenantId: selectedTenant?.id || "" },
    { enabled: !!selectedTenant }
  );

  const { data: trainingData } = trpc.training.listPrograms.useQuery(
    { tenantId: selectedTenant?.id || "" },
    { enabled: !!selectedTenant }
  );

  // PDF export mutations
  const exportRiskMatrix = trpc.nr01Pdf.exportRiskMatrix.useMutation();
  const exportPcmso = trpc.nr01Pdf.exportPcmsoIntegration.useMutation();
  const exportDashboard = trpc.nr01Pdf.exportPsychosocialDashboard.useMutation();
  const exportTrends = trpc.nr01Pdf.exportAssessmentTrends.useMutation();
  const exportFinancial = trpc.nr01Pdf.exportFinancialCalculator.useMutation();
  const exportTimeline = trpc.nr01Pdf.exportComplianceTimeline.useMutation();
  const exportChecklist = trpc.nr01Pdf.exportComplianceChecklist.useMutation();
  const exportCertificate = trpc.nr01Pdf.exportComplianceCertificate.useMutation();
  const exportLaudo = trpc.nr01Pdf.exportLaudoTecnico.useMutation();
  const exportBenchmark = trpc.nr01Pdf.exportBenchmark.useMutation();
  const exportTraining = trpc.nr01Pdf.exportTrainingReport.useMutation();
  const exportDenuncias = trpc.nr01Pdf.exportAnonymousReports.useMutation();
  const exportAlerts = trpc.nr01Pdf.exportDeadlineAlerts.useMutation();
  const exportEsocial = trpc.nr01Pdf.exportEsocialReport.useMutation();
  const exportExecutive = trpc.nr01Pdf.exportExecutiveReport.useMutation();

  // Calculate step statuses
  const hasCopsoqData = !!(copsoqSummary?.dimensions && copsoqSummary.totalRespondents > 0);
  const hasRiskAssessment = !!(riskAssessments && riskAssessments.length > 0);
  const hasActionPlans = !!(actionPlansData && actionPlansData.length > 0);
  const hasChecklist = !!(checklistData && checklistData.length > 0);
  const hasTimeline = !!(timelineData && timelineData.length > 0);
  const hasTraining = !!(trainingData && trainingData.length > 0);

  const checklistConformRate = (() => {
    if (!checklistData || checklistData.length === 0) return 0;
    const conforme = checklistData.filter(
      (c: any) => c.status === "conforme"
    ).length;
    const parcial = checklistData.filter(
      (c: any) => c.status === "parcial"
    ).length;
    const applicable = checklistData.filter(
      (c: any) => c.status !== "nao_aplicavel"
    ).length;
    if (applicable === 0) return 0;
    return Math.round(((conforme + parcial * 0.5) / applicable) * 100);
  })();

  const steps = [
    {
      number: 1,
      title: "Avaliação COPSOQ-II",
      description: "Aplicar questionário, coletar respostas e gerar relatório",
      icon: Brain,
      completed: hasCopsoqData,
      detail: hasCopsoqData
        ? `${copsoqSummary!.totalRespondents} respondentes | Taxa: ${copsoqSummary!.responseRate}%`
        : "Nenhuma avaliação COPSOQ-II encontrada",
      link: "/copsoq",
      linkLabel: hasCopsoqData ? "Ver Resultados" : "Criar Avaliação",
    },
    {
      number: 2,
      title: "Avaliação de Riscos",
      description: "Registrar riscos psicossociais com severidade e probabilidade",
      icon: Target,
      completed: hasRiskAssessment,
      detail: hasRiskAssessment
        ? `${riskAssessments!.length} avaliação(ões) registrada(s)`
        : "Nenhuma avaliação de risco criada",
      link: "/risk-assessments",
      linkLabel: hasRiskAssessment ? "Ver Avaliações" : "Criar Avaliação",
    },
    {
      number: 3,
      title: "Planos de Ação",
      description: "Definir ações corretivas baseadas nos riscos identificados",
      icon: ClipboardList,
      completed: hasActionPlans,
      detail: hasActionPlans
        ? `${actionPlansData!.length} plano(s) de ação`
        : "Nenhum plano de ação criado",
      link: "/action-plans",
      linkLabel: hasActionPlans ? "Gerenciar Planos" : "Criar Plano de Ação",
    },
    {
      number: 4,
      title: "Checklist de Conformidade NR-01",
      description: "Verificar requisitos obrigatórios da NR-01",
      icon: CheckCircle2,
      completed: hasChecklist && checklistConformRate >= 80,
      detail: hasChecklist
        ? `${checklistData!.length} requisitos | ${checklistConformRate}% conforme`
        : "Checklist não inicializado",
      link: "/compliance-checklist",
      linkLabel: hasChecklist ? "Editar Checklist" : "Iniciar Checklist",
    },
    {
      number: 5,
      title: "Cronograma de Implementação",
      description: "Configurar datas-alvo e marcos do projeto",
      icon: Calendar,
      completed: hasTimeline,
      detail: hasTimeline
        ? `${timelineData!.length} milestone(s) configurado(s)`
        : "Cronograma não configurado",
      link: "/compliance-timeline",
      linkLabel: hasTimeline ? "Editar Cronograma" : "Configurar Cronograma",
    },
    {
      number: 6,
      title: "Treinamentos e Capacitação",
      description: "Criar programas de treinamento e acompanhar progresso",
      icon: GraduationCap,
      completed: hasTraining,
      detail: hasTraining
        ? `${trainingData!.length} programa(s) de treinamento`
        : "Nenhum treinamento criado",
      link: "/training",
      linkLabel: hasTraining ? "Gerenciar Treinamentos" : "Criar Programa",
    },
    {
      number: 7,
      title: "Exportar Entregáveis (PDFs)",
      description: "Gerar e baixar todos os 17 relatórios em PDF",
      icon: Download,
      completed: false,
      detail: "Gere todos os PDFs de uma vez",
      link: null,
      linkLabel: "Exportar Todos",
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedSteps / (steps.length - 1)) * 100); // Exclude last step (export)

  const downloadPdf = (filename: string, base64Data: string) => {
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${base64Data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllPdfs = async () => {
    if (!effectiveId) return;
    setExportingPdfs(true);
    const tid = effectiveId;

    const pdfList = [
      { name: "01-Matriz-de-Risco", fn: () => exportRiskMatrix.mutateAsync({ tenantId: tid }) },
      { name: "02-Integracao-PGR-PCMSO", fn: () => exportPcmso.mutateAsync({ tenantId: tid }) },
      { name: "03-Dashboard-Psicossocial", fn: () => exportDashboard.mutateAsync({ tenantId: tid }) },
      { name: "04-Tendencias-Avaliacao", fn: () => exportTrends.mutateAsync({ tenantId: tid }) },
      { name: "05-Calculadora-Financeira", fn: () => exportFinancial.mutateAsync({ tenantId: tid }) },
      { name: "06-Cronograma-NR01", fn: () => exportTimeline.mutateAsync({ tenantId: tid }) },
      { name: "07-Checklist-Conformidade", fn: () => exportChecklist.mutateAsync({ tenantId: tid }) },
      { name: "08-Certificado-Conformidade", fn: () => exportCertificate.mutateAsync({ tenantId: tid }) },
      { name: "09-Laudo-Tecnico", fn: () => exportLaudo.mutateAsync({ tenantId: tid }) },
      { name: "10-Benchmark-COPSOQ", fn: () => exportBenchmark.mutateAsync({ tenantId: tid }) },
      { name: "11-Relatorio-Treinamento", fn: () => exportTraining.mutateAsync({ tenantId: tid }) },
      { name: "12-Relatorio-Denuncias", fn: () => exportDenuncias.mutateAsync({ tenantId: tid }) },
      { name: "13-Alertas-Prazos", fn: () => exportAlerts.mutateAsync({ tenantId: tid }) },
      { name: "14-Relatorio-eSocial", fn: () => exportEsocial.mutateAsync({ tenantId: tid }) },
      { name: "15-Relatorio-Executivo", fn: () => exportExecutive.mutateAsync({ tenantId: tid }) },
    ];

    const results: typeof pdfResults = pdfList.map((p) => ({
      name: p.name,
      status: "pending" as const,
    }));
    setPdfResults([...results]);

    let okCount = 0;
    for (let i = 0; i < pdfList.length; i++) {
      try {
        const result = await pdfList[i].fn();
        if (result?.data && typeof result.data === "string" && result.data.length > 100) {
          downloadPdf(`${pdfList[i].name}.pdf`, result.data);
          results[i] = { name: pdfList[i].name, status: "ok" };
          okCount++;
        } else {
          results[i] = { name: pdfList[i].name, status: "fail" };
        }
      } catch {
        results[i] = { name: pdfList[i].name, status: "fail" };
      }
      setPdfResults([...results]);
      // Small delay to prevent rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    setExportingPdfs(false);
    toast.success(`${okCount}/${pdfList.length} PDFs gerados com sucesso!`);
  };

  if (!effectiveId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para acessar o fluxo de trabalho guiado
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Fluxo de Trabalho Guiado
          </h1>
          <p className="text-muted-foreground">
            Siga os passos abaixo para completar a conformidade NR-01 de{" "}
            <span className="font-semibold">{typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.name ?? "sua empresa"}</span>
          </p>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Progresso Geral
              </span>
              <span className="text-sm text-muted-foreground">
                {completedSteps}/{steps.length - 1} etapas concluídas
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">
              {progressPercent}% completo
            </p>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isExpanded = expandedStep === idx;
            const isLastStep = idx === steps.length - 1;

            return (
              <Card
                key={step.number}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  step.completed
                    ? "border-green-200 bg-green-50/50"
                    : isLastStep
                      ? "border-blue-200 bg-blue-50/50"
                      : ""
                }`}
                onClick={() => setExpandedStep(isExpanded ? null : idx)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Step Number + Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        step.completed
                          ? "bg-green-500 text-white"
                          : isLastStep
                            ? "bg-blue-500 text-white"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-bold">{step.number}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">
                          {step.title}
                        </h3>
                        {step.completed && (
                          <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                            Concluído
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.detail}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      <ChevronRight
                        className={`h-5 w-5 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-3">
                        {step.description}
                      </p>
                      {isLastStep ? (
                        <div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportAllPdfs();
                            }}
                            disabled={exportingPdfs}
                            className="w-full"
                          >
                            {exportingPdfs ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando PDFs...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar Todos os 15 PDFs
                              </>
                            )}
                          </Button>

                          {pdfResults.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {pdfResults.map((pdf) => (
                                <div
                                  key={pdf.name}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {pdf.status === "ok" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                  ) : pdf.status === "fail" ? (
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                  ) : (
                                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                                  )}
                                  <span
                                    className={
                                      pdf.status === "fail"
                                        ? "text-red-600"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {pdf.name}.pdf
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant={step.completed ? "outline" : "default"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (step.link) navigate(step.link);
                          }}
                        >
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          {step.linkLabel}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse diretamente os módulos mais utilizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate("/psychosocial-dashboard")}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Dashboard</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate("/risk-matrix")}
              >
                <Target className="h-5 w-5" />
                <span className="text-xs">Matriz de Risco</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate("/laudo-tecnico")}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Laudo Técnico</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate("/compliance-certificate")}
              >
                <Award className="h-5 w-5" />
                <span className="text-xs">Certificado</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
