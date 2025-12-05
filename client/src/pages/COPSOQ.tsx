import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import copsoqData from "../../../server/data/copsoq-76-questions.json";

export default function COPSOQ() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("form");
  const [currentSection, setCurrentSection] = useState(0);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [personId, setPersonId] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [respondentRole, setRespondentRole] = useState("");
  const [respondentAge, setRespondentAge] = useState("");
  const [respondentGender, setRespondentGender] = useState("");
  const [yearsInCompany, setYearsInCompany] = useState("");
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [mentalHealthSupport, setMentalHealthSupport] = useState("");
  const [workplaceImprovement, setWorkplaceImprovement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitResponseMutation = trpc.assessments.submitResponse.useMutation();

  const questions = copsoqData.questions;
  const sections = useMemo(() => {
    const sectionMap: Record<string, typeof questions> = {};
    questions.forEach(q => {
      if (!sectionMap[q.section]) sectionMap[q.section] = [];
      sectionMap[q.section].push(q);
    });
    return Object.entries(sectionMap);
  }, []);

  const currentSectionData = sections[currentSection]?.[1];
  const progressPercent = Math.round(
    (Object.keys(responses).length / questions.length) * 100
  );

  const handleResponse = (questionId: number, value: number) => {
    setResponses({ ...responses, [questionId]: value });
  };

  const calculateScores = () => {
    const dimensionScores: Record<string, number[]> = {};

    questions.forEach(q => {
      if (!dimensionScores[q.dimension]) dimensionScores[q.dimension] = [];
      const score = responses[q.id] || 0;
      const finalScore = q.reverse ? 5 - score : score;
      dimensionScores[q.dimension].push(finalScore);
    });

    const scores: Record<string, number> = {};
    for (const [dimension, values] of Object.entries(dimensionScores)) {
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        scores[dimension] = Math.round(avg * 20);
      }
    }

    return scores;
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80)
      return {
        level: "critical",
        label: "Crítico",
        color: "text-red-600",
        bg: "bg-red-50",
      };
    if (score >= 60)
      return {
        level: "high",
        label: "Alto",
        color: "text-orange-600",
        bg: "bg-orange-50",
      };
    if (score >= 40)
      return {
        level: "medium",
        label: "Médio",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
      };
    return {
      level: "low",
      label: "Baixo",
      color: "text-green-600",
      bg: "bg-green-50",
    };
  };

  const scores = calculateScores();
  const overallScore = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) /
      Object.keys(scores).length
  );
  const overallRisk = getRiskLevel(overallScore);

  const handleSubmit = async () => {
    if (!user?.id || !assessmentId) {
      setSubmitError("Erro: Avaliação ou usuário não identificado");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitResponseMutation.mutateAsync({
        assessmentId,
        personId: personId || user.id,
        responses: responses as Record<string, number>,
        ageGroup: respondentAge,
        gender: respondentGender,
        yearsInCompany,
        mentalHealthSupport,
        workplaceImprovement,
      });

      setActiveTab("results");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Erro ao salvar avaliação"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Avaliação COPSOQ-II</h1>
        <p className="text-gray-600 mt-2">
          Formulário de Avaliação de Riscos Psicossociais - 76 Questões
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Formulário</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
        </TabsList>

        {/* ABA: FORMULARIO */}
        <TabsContent value="form" className="space-y-6">
          {currentSection === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dados do Respondente</CardTitle>
                <CardDescription>
                  Informações básicas para contextualização da avaliação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={respondentName}
                      onChange={e => setRespondentName(e.target.value)}
                      placeholder="Nome do respondente"
                    />
                  </div>
                  <div>
                    <Label>Cargo/Posição</Label>
                    <Input
                      value={respondentRole}
                      onChange={e => setRespondentRole(e.target.value)}
                      placeholder="Cargo"
                    />
                  </div>
                  <div>
                    <Label>Faixa Etária</Label>
                    <select
                      value={respondentAge}
                      onChange={e => setRespondentAge(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecione...</option>
                      <option value="18-25">18-25 anos</option>
                      <option value="26-35">26-35 anos</option>
                      <option value="36-45">36-45 anos</option>
                      <option value="46-55">46-55 anos</option>
                      <option value="56+">56+ anos</option>
                    </select>
                  </div>
                  <div>
                    <Label>Gênero</Label>
                    <select
                      value={respondentGender}
                      onChange={e => setRespondentGender(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecione...</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Label>Tempo na Empresa (em anos)</Label>
                    <Input
                      type="number"
                      value={yearsInCompany}
                      onChange={e => setYearsInCompany(e.target.value)}
                      placeholder="Anos"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection > 0 &&
            currentSection <= sections.length &&
            currentSectionData && (
              <Card>
                <CardHeader>
                  <CardTitle>{sections[currentSection - 1]?.[0]}</CardTitle>
                  <CardDescription>
                    Avalie cada questão em uma escala de 1 a 5
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {currentSectionData.map(question => (
                    <div
                      key={question.id}
                      className="space-y-3 pb-6 border-b last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {question.id}. {question.text}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Dimensão: {question.dimension}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-blue-600 ml-4">
                          {responses[question.id] || "-"}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-start">
                        {[1, 2, 3, 4, 5].map(value => (
                          <button
                            key={value}
                            onClick={() => handleResponse(question.id, value)}
                            className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                              responses[question.id] === value
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Nunca</span>
                        <span>Raramente</span>
                        <span>Às vezes</span>
                        <span>Frequentemente</span>
                        <span>Sempre</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          {currentSection === sections.length + 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Comentários Adicionais</CardTitle>
                <CardDescription>
                  Compartilhe suas observações e sugestões
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Necessidades de Apoio em Saúde Mental</Label>
                  <Textarea
                    value={mentalHealthSupport}
                    onChange={e => setMentalHealthSupport(e.target.value)}
                    placeholder="Descreva qualquer necessidade ou preocupação..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Sugestões de Melhorias no Ambiente de Trabalho</Label>
                  <Textarea
                    value={workplaceImprovement}
                    onChange={e => setWorkplaceImprovement(e.target.value)}
                    placeholder="Compartilhe suas ideias para melhorias..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {submitError && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <p className="text-red-800">{submitError}</p>
              </CardContent>
            </Card>
          )}

          {/* BARRA DE PROGRESSO */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      Progresso: {progressPercent}%
                    </span>
                    <span className="text-sm text-gray-600">
                      {Object.keys(responses).length} de {questions.length}{" "}
                      questões respondidas
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* BOTOES DE NAVEGACAO */}
                <div className="flex justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentSection(Math.max(0, currentSection - 1))
                    }
                    disabled={currentSection === 0}
                  >
                    Anterior
                  </Button>

                  <div className="text-sm text-gray-600 text-center">
                    Seção {currentSection + 1} de {sections.length + 2}
                  </div>

                  {currentSection < sections.length + 1 ? (
                    <Button
                      onClick={() => setCurrentSection(currentSection + 1)}
                      disabled={
                        currentSection === 0 &&
                        (!respondentName ||
                          !respondentRole ||
                          !respondentAge ||
                          !respondentGender)
                      }
                    >
                      Próximo
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar e Ver Resultados"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: RESULTADOS */}
        <TabsContent value="results" className="space-y-6">
          {/* SCORE GERAL */}
          <Card className={overallRisk.bg}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Avaliação Geral</CardTitle>
                  <CardDescription>
                    Score consolidado de riscos psicossociais
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${overallRisk.color}`}>
                    {overallScore}
                  </div>
                  <div className={`text-lg font-semibold ${overallRisk.color}`}>
                    {overallRisk.label}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* GRID DE DIMENSOES */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(scores).map(([dimension, score]) => {
              const risk = getRiskLevel(score);
              const Icon =
                risk.level === "critical"
                  ? XCircle
                  : risk.level === "high"
                    ? AlertTriangle
                    : risk.level === "medium"
                      ? AlertCircle
                      : CheckCircle;

              return (
                <Card key={dimension} className={risk.bg}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{dimension}</h3>
                        <p className="text-sm text-gray-600">
                          {
                            copsoqData.dimensions[
                              dimension as keyof typeof copsoqData.dimensions
                            ]
                          }
                        </p>
                      </div>
                      <Icon className={`w-6 h-6 ${risk.color}`} />
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Score</span>
                        <span className={`text-2xl font-bold ${risk.color}`}>
                          {score}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            score >= 80
                              ? "bg-red-600"
                              : score >= 60
                                ? "bg-orange-600"
                                : score >= 40
                                  ? "bg-yellow-600"
                                  : "bg-green-600"
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* RECOMENDACOES */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendações</CardTitle>
              <CardDescription>
                Ações sugeridas baseadas nos resultados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overallRisk.level === "critical" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">
                    Risco Crítico Detectado
                  </h4>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                    <li>Implementar intervenções imediatas de saúde mental</li>
                    <li>Revisar carga de trabalho e prazos</li>
                    <li>Aumentar apoio psicológico e coaching</li>
                    <li>Realizar avaliações de acompanhamento frequentes</li>
                  </ul>
                </div>
              )}
              {overallRisk.level === "high" && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">
                    Risco Alto Identificado
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                    <li>Planejar intervenções de gestão de estresse</li>
                    <li>Melhorar comunicação e transparência</li>
                    <li>Oferecer programas de bem-estar</li>
                  </ul>
                </div>
              )}
              {overallRisk.level === "medium" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    Risco Moderado Detectado
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Monitorar situação regularmente</li>
                    <li>Implementar melhorias incrementais</li>
                    <li>Oferecer recursos de desenvolvimento</li>
                  </ul>
                </div>
              )}
              {overallRisk.level === "low" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">
                    Risco Baixo
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                    <li>Manter práticas atuais de bem-estar</li>
                    <li>Continuar monitoramento periódico</li>
                    <li>Compartilhar boas práticas com outras áreas</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1">Exportar Relatório PDF</Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentSection(0)}
            >
              Nova Avaliação
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
