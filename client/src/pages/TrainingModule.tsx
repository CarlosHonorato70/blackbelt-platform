import { useState } from "react";
import DOMPurify from "dompurify";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  PlayCircle,
  Circle,
} from "lucide-react";

function simpleMarkdown(text: string): string {
  if (!text) return "";
  const html = text
    .replace(/## (.+)/g, "<h2 class='text-xl font-semibold mt-4 mb-2'>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
  return DOMPurify.sanitize(html);
}

export default function TrainingModule() {
  usePageMeta({ title: "Modulo de Treinamento" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { programId, moduleId } = useParams<{ programId: string; moduleId: string }>();
  const navigate = useNavigate();

  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  if (!tenantId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Selecione uma empresa para continuar.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!programId || !moduleId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Módulo não encontrado.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { data: program, isLoading } = trpc.training.getProgram.useQuery(
    { id: programId, tenantId },
    { enabled: !!programId && !!tenantId }
  );

  const completeMutation = trpc.training.completeModule.useMutation({
    onSuccess: (data: any) => {
      if (data.completed) {
        toast.success(quizResult ? `Módulo concluído! Nota: ${quizResult.score}%` : "Módulo concluído com sucesso!");
      } else {
        toast.error(data.message || "Nota insuficiente. Tente novamente.");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao concluir módulo");
    },
  });

  const modules = program?.modules || [];
  const currentModule = modules.find((m: any) => m.id === moduleId) || modules[0];

  const totalModules = modules.length;
  const completedModules = modules.filter((m: any) => m.completed).length;
  const progressPercent = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  const quizQuestions: any[] = Array.isArray(currentModule?.quizQuestions) ? currentModule.quizQuestions : [];

  // Grade quiz: compare selected answers against correctAnswer field
  const gradeQuiz = (): number | undefined => {
    if (quizQuestions.length === 0) return undefined;
    const answered = Object.keys(quizAnswers).length;
    if (answered === 0) return 0;
    let correct = 0;
    quizQuestions.forEach((q: any, idx: number) => {
      if (q.correctAnswer && quizAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / quizQuestions.length) * 100);
  };

  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);

  const handleComplete = () => {
    const score = gradeQuiz();
    const passingScore = (currentModule as any)?.passingScore ?? 70;

    if (score !== undefined) {
      const passed = score >= passingScore;
      setQuizResult({ score, passed });
      if (!passed) {
        toast.error(`Nota insuficiente: ${score}%. Mínimo: ${passingScore}%`);
      }
    }

    completeMutation.mutate({
      participantId: programId!,
      moduleId: moduleId!,
      tenantId,
      quizScore: score,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/training/${programId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {currentModule?.title || "Modulo"}
            </h1>
            <p className="text-muted-foreground">
              {program?.title || "Carregando..."}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Progresso do Programa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Progress value={progressPercent} className="flex-1" />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {completedModules} / {totalModules} modulos
                  </span>
                </div>
              </CardContent>
            </Card>

            {currentModule?.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Conteudo do Modulo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: simpleMarkdown(currentModule.content) }}
                  />
                </CardContent>
              </Card>
            )}

            {currentModule?.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Video
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video">
                    <iframe
                      src={currentModule.videoUrl}
                      title="Video do Modulo"
                      className="w-full h-full rounded-md"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {quizQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Quiz
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {quizQuestions.map((q: any, qIndex: number) => {
                      const isGraded = quizResult !== null;
                      const userAnswer = quizAnswers[qIndex];
                      const isCorrect = userAnswer === q.correctAnswer;

                      return (
                        <div key={qIndex} className="space-y-3">
                          <Label className="text-base font-medium">
                            {qIndex + 1}. {q.question}
                            {isGraded && (
                              <span className={`ml-2 text-sm ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                                {isCorrect ? "✓ Correto" : "✗ Incorreto"}
                              </span>
                            )}
                          </Label>
                          <div className="space-y-2 pl-4">
                            {(q.options || []).map((option: string, oIndex: number) => {
                              const isSelected = userAnswer === option;
                              const isCorrectOption = isGraded && option === q.correctAnswer;
                              let optionClass = "hover:bg-muted";
                              if (isGraded) {
                                if (isCorrectOption) optionClass = "bg-green-50 border border-green-300";
                                else if (isSelected && !isCorrect) optionClass = "bg-red-50 border border-red-300";
                              }

                              return (
                                <label
                                  key={oIndex}
                                  className={`flex items-center gap-3 ${isGraded ? "" : "cursor-pointer"} p-2 rounded-md ${optionClass}`}
                                >
                                  {isSelected ? (
                                    <CheckCircle2 className={`h-5 w-5 ${isGraded ? (isCorrect ? "text-green-600" : "text-red-600") : "text-primary"}`} />
                                  ) : (
                                    <Circle className={`h-5 w-5 ${isCorrectOption ? "text-green-600" : "text-muted-foreground"}`} />
                                  )}
                                  <input
                                    type="radio"
                                    name={`quiz-${qIndex}`}
                                    value={option}
                                    checked={isSelected}
                                    disabled={isGraded}
                                    onChange={() =>
                                      setQuizAnswers({ ...quizAnswers, [qIndex]: option })
                                    }
                                    className="sr-only"
                                  />
                                  <span>{option}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {quizResult && (
                      <div className={`p-4 rounded-lg ${quizResult.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                        <p className={`font-semibold ${quizResult.passed ? "text-green-800" : "text-red-800"}`}>
                          {quizResult.passed ? "Aprovado!" : "Reprovado"} — Nota: {quizResult.score}%
                        </p>
                        {!quizResult.passed && (
                          <p className="text-sm text-red-700 mt-1">
                            Mínimo necessário: {(currentModule as any)?.passingScore ?? 70}%. Revise o conteúdo e tente novamente.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={completeMutation.isPending || (currentModule as any)?.completed}
              >
                {completeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(currentModule as any)?.completed ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Módulo Concluído
                  </>
                ) : (
                  "Concluir Modulo"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
