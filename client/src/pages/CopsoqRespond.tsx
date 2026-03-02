import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import copsoqData from "../../../server/data/copsoq-76-questions.json";

type Question = {
  id: number;
  text: string;
  dimension: string;
  section: string;
  reverse?: boolean;
};

export default function CopsoqRespond() {
  const { token } = useParams<{ token: string }>();

  const inviteQuery = trpc.webhook.checkInviteStatus.useQuery(
    { inviteToken: token ?? "" },
    { enabled: !!token, retry: false }
  );

  const submitMutation = trpc.webhook.submitPublicResponse.useMutation();

  const [step, setStep] = useState(0); // 0=demographics, 1..N=sections, N+1=comments
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [yearsInCompany, setYearsInCompany] = useState("");
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [mentalHealthSupport, setMentalHealthSupport] = useState("");
  const [workplaceImprovement, setWorkplaceImprovement] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const questions: Question[] = copsoqData.questions;
  const sections = useMemo(() => {
    const map: Record<string, Question[]> = {};
    questions.forEach((q) => {
      if (!map[q.section]) map[q.section] = [];
      map[q.section].push(q);
    });
    return Object.entries(map);
  }, [questions]);

  const totalSteps = sections.length + 2; // demographics + sections + comments
  const progressPercent = Math.round(
    (Object.keys(responses).length / questions.length) * 100
  );

  const handleResponse = (questionId: number, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    try {
      await submitMutation.mutateAsync({
        inviteToken: token,
        responses: responses as Record<string, number>,
        ageGroup: ageGroup || undefined,
        gender: gender || undefined,
        yearsInCompany: yearsInCompany || undefined,
        mentalHealthSupport: mentalHealthSupport || undefined,
        workplaceImprovement: workplaceImprovement || undefined,
      });
      setSubmitted(true);
    } catch {
      // error is displayed via submitMutation.error
    }
  };

  // --- Loading state ---
  if (inviteQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando questionário...</p>
        </div>
      </div>
    );
  }

  // --- Error / not found ---
  if (inviteQuery.error || !inviteQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Convite Inválido</h2>
            <p className="text-gray-600">
              Este link de convite não foi encontrado ou é inválido. Verifique
              se o link está correto ou entre em contato com o responsável pela
              avaliação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invite = inviteQuery.data;

  // --- Expired ---
  if (invite.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Convite Expirado</h2>
            <p className="text-gray-600">
              O prazo para responder esta avaliação já encerrou. Entre em
              contato com o responsável para solicitar um novo convite.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Already completed ---
  if (invite.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Já Respondido</h2>
            <p className="text-gray-600">
              Este questionário já foi preenchido. Obrigado pela sua
              participação!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Submitted successfully ---
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">
              Obrigado pela sua participação!
            </h2>
            <p className="text-gray-600 mb-4">
              Suas respostas foram registradas com sucesso. Os dados são
              tratados de forma confidencial e serão utilizados exclusivamente
              para a melhoria do ambiente de trabalho.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <ShieldCheck className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800">
                Suas respostas são anônimas e protegidas conforme a LGPD.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Active questionnaire ---
  const currentSectionQuestions =
    step >= 1 && step <= sections.length ? sections[step - 1][1] : [];
  const currentSectionName =
    step >= 1 && step <= sections.length ? sections[step - 1][0] : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            Avaliação COPSOQ-II
          </h1>
          <p className="text-sm text-gray-500">
            Questionário de Riscos Psicossociais no Trabalho
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome bar */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm text-blue-800">
                  Olá, <strong>{invite.respondentName}</strong>
                </p>
                <p className="text-xs text-blue-600">
                  Suas respostas são confidenciais e anônimas
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-800">
                  {progressPercent}% completo
                </p>
                <p className="text-xs text-blue-600">
                  {Object.keys(responses).length} de {questions.length} questões
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2 mt-3" />
          </CardContent>
        </Card>

        {/* Step 0: Demographics */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Dados Demográficos</CardTitle>
              <CardDescription>
                Informações opcionais para contextualização estatística. Seus
                dados são tratados de forma anônima.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Faixa Etária</Label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Prefiro não informar</option>
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
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Prefiro não informar</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <Label>Tempo na Empresa</Label>
                <select
                  value={yearsInCompany}
                  onChange={(e) => setYearsInCompany(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Prefiro não informar</option>
                  <option value="menos-1">Menos de 1 ano</option>
                  <option value="1-3">1-3 anos</option>
                  <option value="4-7">4-7 anos</option>
                  <option value="8-15">8-15 anos</option>
                  <option value="15+">Mais de 15 anos</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Steps 1..N: Question sections */}
        {step >= 1 && step <= sections.length && (
          <Card>
            <CardHeader>
              <CardTitle>{currentSectionName}</CardTitle>
              <CardDescription>
                Avalie cada afirmação de acordo com a sua experiência no
                trabalho.
                <br />
                <strong>1</strong> = Nunca &nbsp; <strong>2</strong> = Raramente
                &nbsp; <strong>3</strong> = Às vezes &nbsp; <strong>4</strong> =
                Frequentemente &nbsp; <strong>5</strong> = Sempre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentSectionQuestions.map((question) => (
                <div
                  key={question.id}
                  className="space-y-2 pb-5 border-b last:border-b-0"
                >
                  <p className="text-sm font-medium">
                    {question.id}. {question.text}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleResponse(question.id, value)}
                        className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                          responses[question.id] === value
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 px-1">
                    <span>Nunca</span>
                    <span>Raramente</span>
                    <span>Às vezes</span>
                    <span>Frequente</span>
                    <span>Sempre</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Last step: Comments */}
        {step === sections.length + 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Comentários Adicionais</CardTitle>
              <CardDescription>
                Opcional. Compartilhe observações ou sugestões que considerar
                importantes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Necessidades de Apoio em Saúde Mental</Label>
                <Textarea
                  value={mentalHealthSupport}
                  onChange={(e) => setMentalHealthSupport(e.target.value)}
                  placeholder="Descreva necessidades ou preocupações que gostaria de compartilhar..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sugestões de Melhoria no Ambiente de Trabalho</Label>
                <Textarea
                  value={workplaceImprovement}
                  onChange={(e) => setWorkplaceImprovement(e.target.value)}
                  placeholder="Compartilhe ideias para melhorar o ambiente de trabalho..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit error */}
        {submitMutation.error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-red-800 text-sm">
                {submitMutation.error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          <span className="text-sm text-gray-500">
            Etapa {step + 1} de {totalSteps}
          </span>

          {step < sections.length + 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || Object.keys(responses).length < questions.length}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Respostas"
              )}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8">
          <ShieldCheck className="w-4 h-4 inline-block mr-1" />
          Protegido pela LGPD. Dados tratados com confidencialidade.
        </div>
      </div>
    </div>
  );
}
