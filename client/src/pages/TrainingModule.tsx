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
    onSuccess: () => {
      toast.success("Modulo concluido com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao concluir modulo");
    },
  });

  const modules = program?.modules || [];
  const currentModule = modules.find((m: any) => m.id === moduleId) || modules[0];

  const totalModules = modules.length;
  const completedModules = modules.filter((m: any) => m.completed).length;
  const progressPercent = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  const quizQuestions: any[] = Array.isArray(currentModule?.quizQuestions) ? currentModule.quizQuestions : [];

  const handleComplete = () => {
    completeMutation.mutate({
      participantId: programId!,
      moduleId: moduleId!,
      tenantId,
      quizScore: Object.keys(quizAnswers).length > 0 ? Object.keys(quizAnswers).length : undefined,
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
                    {quizQuestions.map((q: any, qIndex: number) => (
                      <div key={qIndex} className="space-y-3">
                        <Label className="text-base font-medium">
                          {qIndex + 1}. {q.question}
                        </Label>
                        <div className="space-y-2 pl-4">
                          {(q.options || []).map((option: string, oIndex: number) => (
                            <label
                              key={oIndex}
                              className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted"
                            >
                              {quizAnswers[qIndex] === option ? (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <input
                                type="radio"
                                name={`quiz-${qIndex}`}
                                value={option}
                                checked={quizAnswers[qIndex] === option}
                                onChange={() =>
                                  setQuizAnswers({ ...quizAnswers, [qIndex]: option })
                                }
                                className="sr-only"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
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
