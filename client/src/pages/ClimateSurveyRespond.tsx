import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

const LIKERT_OPTIONS = [
  { value: 1, label: "Discordo Totalmente" },
  { value: 2, label: "Discordo" },
  { value: 3, label: "Neutro" },
  { value: 4, label: "Concordo" },
  { value: 5, label: "Concordo Totalmente" },
];

export default function ClimateSurveyRespond() {
  const { token } = useParams<{ token: string }>();
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const surveyQuery = trpc.climateSurveys.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  const submitMutation = trpc.climateSurveys.submitResponse.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleResponse = (questionIndex: number, value: number) => {
    setResponses((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmit = () => {
    if (!token) return;
    submitMutation.mutate({
      token,
      responses,
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <p className="text-lg text-muted-foreground">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (surveyQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (surveyQuery.isError || !surveyQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <p className="text-lg text-muted-foreground">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Obrigado pela sua participação!</h2>
            <p className="text-muted-foreground">
              Sua resposta foi registrada com sucesso. Agradecemos sua contribuição.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const survey = surveyQuery.data as any;
  const questions: { text: string }[] = Array.isArray(survey.questions)
    ? survey.questions
    : JSON.parse(survey.questions || "[]");

  const allAnswered = questions.length > 0 && Object.keys(responses).length === questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <ClipboardList className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && (
              <CardDescription className="text-base mt-2">
                {survey.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        {questions.map((question, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <Label className="text-base font-medium mb-4 block">
                {index + 1}. {question.text}
              </Label>
              <div className="grid gap-2 sm:grid-cols-5">
                {LIKERT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                      responses[index] === option.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={option.value}
                      checked={responses[index] === option.value}
                      onChange={() => handleResponse(index, option.value)}
                      className="sr-only"
                    />
                    <span className="text-lg font-bold">{option.value}</span>
                    <span className="text-xs text-center text-muted-foreground leading-tight">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!allAnswered || submitMutation.isPending}
            className="w-full max-w-sm"
          >
            {submitMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Enviar Respostas
          </Button>
        </div>

        {submitMutation.isError && (
          <Card className="border-red-200">
            <CardContent className="p-4 text-center text-red-600">
              Erro ao enviar respostas. Tente novamente.
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Suas respostas são anônimas e confidenciais.
        </p>
      </div>
    </div>
  );
}
