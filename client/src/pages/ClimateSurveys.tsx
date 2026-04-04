import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { Plus, ClipboardList, Loader2, BarChart2, FileDown, BookOpen, CheckCircle2 } from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useNavigate } from "react-router-dom";

const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  climate: { label: "Clima", variant: "default" },
  stress: { label: "Estresse", variant: "outline" },
  burnout: { label: "Burnout", variant: "destructive" },
  engagement: { label: "Engajamento", variant: "secondary" },
  custom: { label: "Personalizada", variant: "outline" },
};

// ══════════════════════════════════════════════════════════════
// INSTRUMENTOS VALIDADOS CIENTIFICAMENTE
// ══════════════════════════════════════════════════════════════

interface SurveyInstrument {
  id: string;
  name: string;
  shortName: string;
  description: string;
  authors: string;
  validation: string;
  dimensions: string[];
  questionCount: number;
  estimatedTime: string;
  surveyType: string;
  questions: Array<{ text: string; type: string; dimension: string; options: number[]; reverse?: boolean }>;
}

const SURVEY_INSTRUMENTS: SurveyInstrument[] = [
  {
    id: "eact",
    name: "Escala de Avaliação do Contexto de Trabalho",
    shortName: "EACT",
    description: "Avalia a percepção dos trabalhadores sobre o contexto de trabalho em três dimensões: organização, condições e relações socioprofissionais.",
    authors: "Mendes & Ferreira (2007)",
    validation: "Validada no Brasil — Universidade de Brasília (UnB). Alpha de Cronbach > 0.90. Publicada no periódico Estudos de Psicologia.",
    dimensions: ["Organização do Trabalho", "Condições de Trabalho", "Relações Socioprofissionais"],
    questionCount: 31,
    estimatedTime: "10-15 minutos",
    surveyType: "climate",
    questions: [
      // Dimensão 1: Organização do Trabalho (11 itens)
      { text: "O ritmo de trabalho é excessivo", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "As tarefas são cumpridas com pressão de prazos", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "A cobrança por resultados é forte", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "As normas para execução das tarefas são rígidas", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "Existe fiscalização do desempenho", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "O número de pessoas é insuficiente para realizar as tarefas", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "Os resultados esperados estão fora da realidade", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "Existe divisão entre quem planeja e quem executa", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "As tarefas são repetitivas", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "Falta tempo para realizar pausas de descanso no trabalho", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "As tarefas executadas sofrem descontinuidade", type: "scale", dimension: "Organização do Trabalho", options: [1,2,3,4,5], reverse: true },

      // Dimensão 2: Condições de Trabalho (10 itens)
      { text: "As condições de trabalho são precárias", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "O ambiente físico é desconfortável", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "Existe barulho no ambiente de trabalho", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "O mobiliário existente no local de trabalho é inadequado", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "Os instrumentos de trabalho são insuficientes para realizar as tarefas", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "O posto de trabalho é inadequado para a realização das tarefas", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "Os equipamentos necessários para a realização das tarefas são precários", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "O espaço físico para realizar o trabalho é inadequado", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "As condições de trabalho oferecem riscos à segurança das pessoas", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },
      { text: "O material de consumo é insuficiente", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5], reverse: true },

      // Dimensão 3: Relações Socioprofissionais (10 itens)
      { text: "As tarefas não são claramente definidas", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "A autonomia é inexistente", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "A distribuição das tarefas é injusta", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "Os funcionários são excluídos das decisões", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "Existem dificuldades na comunicação entre chefia e subordinados", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "Existem disputas profissionais no local de trabalho", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "Falta integração no ambiente de trabalho", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "A comunicação entre funcionários é insatisfatória", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "Falta apoio das chefias para o meu desenvolvimento profissional", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
      { text: "As informações que preciso para executar minhas tarefas são de difícil acesso", type: "scale", dimension: "Relações Socioprofissionais", options: [1,2,3,4,5], reverse: true },
    ],
  },
  {
    id: "itra",
    name: "Inventário sobre Trabalho e Riscos de Adoecimento",
    shortName: "ITRA",
    description: "Avalia os riscos de adoecimento relacionados ao trabalho em quatro dimensões: custo humano, prazer-sofrimento, danos físicos e psicossociais.",
    authors: "Mendes & Ferreira (2007)",
    validation: "Validado no Brasil — UnB. Alpha de Cronbach entre 0.84 e 0.96. Referência em ergonomia da atividade aplicada à qualidade de vida no trabalho.",
    dimensions: ["Custo Afetivo", "Custo Cognitivo", "Custo Físico", "Realização Profissional", "Liberdade de Expressão", "Esgotamento Profissional", "Falta de Reconhecimento"],
    questionCount: 32,
    estimatedTime: "10-15 minutos",
    surveyType: "stress",
    questions: [
      // Custo Afetivo (5 itens)
      { text: "Tenho que ter controle das emoções", type: "scale", dimension: "Custo Afetivo", options: [1,2,3,4,5], reverse: true },
      { text: "Sou obrigado a lidar com a agressividade dos outros", type: "scale", dimension: "Custo Afetivo", options: [1,2,3,4,5], reverse: true },
      { text: "Disfarço meus sentimentos", type: "scale", dimension: "Custo Afetivo", options: [1,2,3,4,5], reverse: true },
      { text: "Sou obrigado a elogiar as pessoas", type: "scale", dimension: "Custo Afetivo", options: [1,2,3,4,5], reverse: true },
      { text: "Sou obrigado a ter bom humor", type: "scale", dimension: "Custo Afetivo", options: [1,2,3,4,5], reverse: true },

      // Custo Cognitivo (5 itens)
      { text: "Tenho que desenvolver macetes", type: "scale", dimension: "Custo Cognitivo", options: [1,2,3,4,5], reverse: true },
      { text: "Tenho que resolver problemas", type: "scale", dimension: "Custo Cognitivo", options: [1,2,3,4,5], reverse: true },
      { text: "Sou obrigado a usar a criatividade", type: "scale", dimension: "Custo Cognitivo", options: [1,2,3,4,5], reverse: true },
      { text: "Tenho que ter a atenção para vários assuntos ao mesmo tempo", type: "scale", dimension: "Custo Cognitivo", options: [1,2,3,4,5], reverse: true },
      { text: "Uso a memória constantemente", type: "scale", dimension: "Custo Cognitivo", options: [1,2,3,4,5], reverse: true },

      // Custo Físico (5 itens)
      { text: "Uso a força física", type: "scale", dimension: "Custo Físico", options: [1,2,3,4,5], reverse: true },
      { text: "Uso os braços de forma contínua", type: "scale", dimension: "Custo Físico", options: [1,2,3,4,5], reverse: true },
      { text: "Fico em posição curvada", type: "scale", dimension: "Custo Físico", options: [1,2,3,4,5], reverse: true },
      { text: "Tenho que caminhar", type: "scale", dimension: "Custo Físico", options: [1,2,3,4,5], reverse: true },
      { text: "Sou obrigado a ficar em pé", type: "scale", dimension: "Custo Físico", options: [1,2,3,4,5], reverse: true },

      // Realização Profissional (5 itens)
      { text: "Sinto satisfação no meu trabalho", type: "scale", dimension: "Realização Profissional", options: [1,2,3,4,5] },
      { text: "Sinto-me motivado", type: "scale", dimension: "Realização Profissional", options: [1,2,3,4,5] },
      { text: "Sinto orgulho do que faço", type: "scale", dimension: "Realização Profissional", options: [1,2,3,4,5] },
      { text: "Tenho disposição para realizar minhas tarefas", type: "scale", dimension: "Realização Profissional", options: [1,2,3,4,5] },
      { text: "Meu trabalho é importante para a sociedade", type: "scale", dimension: "Realização Profissional", options: [1,2,3,4,5] },

      // Liberdade de Expressão (4 itens)
      { text: "Tenho liberdade para expressar o que penso no local de trabalho", type: "scale", dimension: "Liberdade de Expressão", options: [1,2,3,4,5] },
      { text: "Tenho confiança entre os colegas", type: "scale", dimension: "Liberdade de Expressão", options: [1,2,3,4,5] },
      { text: "Tenho liberdade para usar minha criatividade no trabalho", type: "scale", dimension: "Liberdade de Expressão", options: [1,2,3,4,5] },
      { text: "Tenho cooperação entre os colegas", type: "scale", dimension: "Liberdade de Expressão", options: [1,2,3,4,5] },

      // Esgotamento Profissional (4 itens)
      { text: "Sinto-me esgotado emocionalmente", type: "scale", dimension: "Esgotamento Profissional", options: [1,2,3,4,5], reverse: true },
      { text: "Sinto-me frustrado com meu trabalho", type: "scale", dimension: "Esgotamento Profissional", options: [1,2,3,4,5], reverse: true },
      { text: "Meu trabalho me faz sofrer", type: "scale", dimension: "Esgotamento Profissional", options: [1,2,3,4,5], reverse: true },
      { text: "Sinto desânimo no trabalho", type: "scale", dimension: "Esgotamento Profissional", options: [1,2,3,4,5], reverse: true },

      // Falta de Reconhecimento (4 itens)
      { text: "Sinto falta de reconhecimento pelo meu esforço", type: "scale", dimension: "Falta de Reconhecimento", options: [1,2,3,4,5], reverse: true },
      { text: "Sinto-me injustiçado", type: "scale", dimension: "Falta de Reconhecimento", options: [1,2,3,4,5], reverse: true },
      { text: "Sinto-me desvalorizado", type: "scale", dimension: "Falta de Reconhecimento", options: [1,2,3,4,5], reverse: true },
      { text: "Sinto indignação com a forma como sou tratado", type: "scale", dimension: "Falta de Reconhecimento", options: [1,2,3,4,5], reverse: true },
    ],
  },
  {
    id: "qvt-walton",
    name: "Qualidade de Vida no Trabalho — Modelo Walton",
    shortName: "QVT-Walton",
    description: "Avalia a qualidade de vida no trabalho em 8 dimensões fundamentais do modelo de Richard Walton, adaptado e validado para o contexto brasileiro.",
    authors: "Walton (1973), adaptação Fernandes (1996)",
    validation: "Validado no Brasil — amplamente utilizado em pesquisas acadêmicas e empresariais brasileiras. Referência em QVT no Brasil. Alpha de Cronbach > 0.85.",
    dimensions: [
      "Compensação Justa e Adequada",
      "Condições de Trabalho",
      "Uso e Desenvolvimento de Capacidades",
      "Oportunidade de Crescimento",
      "Integração Social",
      "Constitucionalismo",
      "Trabalho e Espaço Total de Vida",
      "Relevância Social",
    ],
    questionCount: 35,
    estimatedTime: "10-15 minutos",
    surveyType: "engagement",
    questions: [
      // Compensação Justa e Adequada (4 itens)
      { text: "Minha remuneração é justa em relação ao trabalho que realizo", type: "scale", dimension: "Compensação Justa e Adequada", options: [1,2,3,4,5] },
      { text: "Meu salário é adequado comparado ao mercado", type: "scale", dimension: "Compensação Justa e Adequada", options: [1,2,3,4,5] },
      { text: "Os benefícios oferecidos pela empresa são satisfatórios", type: "scale", dimension: "Compensação Justa e Adequada", options: [1,2,3,4,5] },
      { text: "Existe equidade salarial entre funções semelhantes", type: "scale", dimension: "Compensação Justa e Adequada", options: [1,2,3,4,5] },

      // Condições de Trabalho (5 itens)
      { text: "Minha jornada de trabalho é adequada", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5] },
      { text: "Meu ambiente de trabalho é seguro e saudável", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5] },
      { text: "Os recursos e materiais de trabalho são adequados", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5] },
      { text: "O ambiente físico é confortável", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5] },
      { text: "A carga de trabalho é razoável", type: "scale", dimension: "Condições de Trabalho", options: [1,2,3,4,5] },

      // Uso e Desenvolvimento de Capacidades (5 itens)
      { text: "Tenho autonomia para tomar decisões sobre meu trabalho", type: "scale", dimension: "Uso e Desenvolvimento de Capacidades", options: [1,2,3,4,5] },
      { text: "Consigo utilizar minhas habilidades e conhecimentos no trabalho", type: "scale", dimension: "Uso e Desenvolvimento de Capacidades", options: [1,2,3,4,5] },
      { text: "Recebo informações suficientes sobre meu desempenho", type: "scale", dimension: "Uso e Desenvolvimento de Capacidades", options: [1,2,3,4,5] },
      { text: "Minhas tarefas têm significado e importância", type: "scale", dimension: "Uso e Desenvolvimento de Capacidades", options: [1,2,3,4,5] },
      { text: "Tenho variedade de atividades no meu trabalho", type: "scale", dimension: "Uso e Desenvolvimento de Capacidades", options: [1,2,3,4,5] },

      // Oportunidade de Crescimento (4 itens)
      { text: "A empresa oferece oportunidades de crescimento profissional", type: "scale", dimension: "Oportunidade de Crescimento", options: [1,2,3,4,5] },
      { text: "Tenho acesso a treinamentos e capacitações", type: "scale", dimension: "Oportunidade de Crescimento", options: [1,2,3,4,5] },
      { text: "Existem perspectivas de promoção na empresa", type: "scale", dimension: "Oportunidade de Crescimento", options: [1,2,3,4,5] },
      { text: "A empresa incentiva meu desenvolvimento pessoal", type: "scale", dimension: "Oportunidade de Crescimento", options: [1,2,3,4,5] },

      // Integração Social (5 itens)
      { text: "Existe igualdade de tratamento entre os funcionários", type: "scale", dimension: "Integração Social", options: [1,2,3,4,5] },
      { text: "Há um bom relacionamento entre os colegas de trabalho", type: "scale", dimension: "Integração Social", options: [1,2,3,4,5] },
      { text: "Existe espírito de equipe na empresa", type: "scale", dimension: "Integração Social", options: [1,2,3,4,5] },
      { text: "Não há preconceito ou discriminação no ambiente de trabalho", type: "scale", dimension: "Integração Social", options: [1,2,3,4,5] },
      { text: "A convivência com a chefia é respeitosa", type: "scale", dimension: "Integração Social", options: [1,2,3,4,5] },

      // Constitucionalismo (4 itens)
      { text: "A empresa respeita os direitos trabalhistas", type: "scale", dimension: "Constitucionalismo", options: [1,2,3,4,5] },
      { text: "Existe liberdade de expressão no trabalho", type: "scale", dimension: "Constitucionalismo", options: [1,2,3,4,5] },
      { text: "As normas e regras são justas e aplicadas igualmente", type: "scale", dimension: "Constitucionalismo", options: [1,2,3,4,5] },
      { text: "Minha privacidade pessoal é respeitada", type: "scale", dimension: "Constitucionalismo", options: [1,2,3,4,5] },

      // Trabalho e Espaço Total de Vida (4 itens)
      { text: "Consigo equilibrar minha vida pessoal e profissional", type: "scale", dimension: "Trabalho e Espaço Total de Vida", options: [1,2,3,4,5] },
      { text: "Meus horários de trabalho não prejudicam minha vida familiar", type: "scale", dimension: "Trabalho e Espaço Total de Vida", options: [1,2,3,4,5] },
      { text: "Tenho tempo para lazer e atividades pessoais", type: "scale", dimension: "Trabalho e Espaço Total de Vida", options: [1,2,3,4,5] },
      { text: "A empresa respeita meu tempo fora do trabalho", type: "scale", dimension: "Trabalho e Espaço Total de Vida", options: [1,2,3,4,5] },

      // Relevância Social (4 itens)
      { text: "Tenho orgulho de trabalhar nesta empresa", type: "scale", dimension: "Relevância Social", options: [1,2,3,4,5] },
      { text: "A empresa é socialmente responsável", type: "scale", dimension: "Relevância Social", options: [1,2,3,4,5] },
      { text: "A empresa tem boa imagem perante a comunidade", type: "scale", dimension: "Relevância Social", options: [1,2,3,4,5] },
      { text: "Contribuo para a sociedade por meio do meu trabalho", type: "scale", dimension: "Relevância Social", options: [1,2,3,4,5] },
    ],
  },
];

export default function ClimateSurveys() {
  usePageMeta({ title: "Pesquisas de Clima" });
  const { exportPdf, isExporting } = usePdfExport();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"select" | "custom">("select");
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    surveyType: "climate",
    questions: "",
  });

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

  const { data: surveys = [], refetch } = trpc.climateSurveys.list.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const createMutation = trpc.climateSurveys.create.useMutation({
    onSuccess: () => {
      toast.success("Pesquisa criada com sucesso!");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar pesquisa");
    },
  });

  const exportClimateSurveyMutation = trpc.nr01Pdf.exportClimateSurvey.useMutation();

  const resetForm = () => {
    setForm({ title: "", description: "", surveyType: "climate", questions: "" });
    setSelectedInstrument(null);
    setDialogMode("select");
  };

  const handleSelectInstrument = (instrumentId: string) => {
    const instrument = SURVEY_INSTRUMENTS.find(i => i.id === instrumentId);
    if (!instrument) return;

    setSelectedInstrument(instrumentId);
    setForm({
      title: instrument.name,
      description: `${instrument.description}\n\nAutores: ${instrument.authors}\nValidação: ${instrument.validation}`,
      surveyType: instrument.surveyType,
      questions: JSON.stringify(instrument.questions, null, 2),
    });
  };

  const handleCreate = () => {
    if (!form.title) {
      toast.error("Informe o título da pesquisa");
      return;
    }

    let parsedQuestions;
    if (form.questions.trim()) {
      try {
        parsedQuestions = JSON.parse(form.questions);
      } catch {
        toast.error("JSON das perguntas está inválido");
        return;
      }
    }

    createMutation.mutate({
      tenantId,
      title: form.title,
      description: form.description,
      surveyType: form.surveyType as "custom" | "climate" | "stress" | "burnout" | "engagement",
      questions: parsedQuestions,
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pesquisas de Clima</h1>
            <p className="text-muted-foreground">
              Gerencie pesquisas de clima, estresse, burnout e engajamento
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => exportClimateSurveyMutation.mutateAsync({ tenantId: tenantId!, surveyId: surveys[0]?.id || "" }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </Button>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pesquisa
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pesquisas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {surveys.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma pesquisa cadastrada ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Respostas</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((survey: any) => {
                    const typeConfig = TYPE_CONFIG[survey.surveyType] || TYPE_CONFIG.climate;
                    return (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">{survey.title}</TableCell>
                        <TableCell>
                          <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={survey.status === "active" ? "default" : "secondary"}>
                            {survey.status === "active" ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{survey.responseCount ?? 0}</TableCell>
                        <TableCell>
                          {survey.createdAt
                            ? new Date(survey.createdAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/climate-surveys/${survey.id}/results`)}
                          >
                            <BarChart2 className="mr-1 h-4 w-4" />
                            Resultados
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className={dialogMode === "select" ? "max-w-3xl" : "max-w-lg"}>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === "select" ? "Escolha o Instrumento de Pesquisa" : "Configurar Pesquisa"}
              </DialogTitle>
            </DialogHeader>

            {dialogMode === "select" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione um instrumento validado cientificamente ou crie uma pesquisa personalizada.
                  Você pode aplicar mais de um instrumento simultaneamente.
                </p>

                <div className="grid gap-4">
                  {SURVEY_INSTRUMENTS.map((instrument) => (
                    <Card
                      key={instrument.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
                        selectedInstrument === instrument.id ? "border-primary ring-2 ring-primary/20" : ""
                      }`}
                      onClick={() => handleSelectInstrument(instrument.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              {instrument.shortName} — {instrument.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {instrument.authors}
                            </CardDescription>
                          </div>
                          {selectedInstrument === instrument.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-3">{instrument.description}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {instrument.dimensions.map((dim) => (
                            <Badge key={dim} variant="outline" className="text-xs">
                              {dim}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                          <span>{instrument.questionCount} questões</span>
                          <span>{instrument.estimatedTime}</span>
                        </div>
                        <p className="text-xs text-green-700 mt-2 bg-green-50 px-2 py-1 rounded">
                          {instrument.validation}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => { setDialogMode("custom"); setSelectedInstrument(null); setForm({ title: "", description: "", surveyType: "climate", questions: "" }); }}>
                    Pesquisa Personalizada
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => setDialogMode("custom")}
                      disabled={!selectedInstrument}
                    >
                      Continuar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedInstrument && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-primary">
                      Instrumento: {SURVEY_INSTRUMENTS.find(i => i.id === selectedInstrument)?.shortName} — {SURVEY_INSTRUMENTS.find(i => i.id === selectedInstrument)?.questionCount} questões
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Pesquisa de Clima Organizacional 2026"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Objetivo e contexto da pesquisa..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Tipo de Pesquisa</Label>
                  <Select value={form.surveyType} onValueChange={(v) => setForm({ ...form, surveyType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="climate">Clima Organizacional</SelectItem>
                      <SelectItem value="stress">Estresse Ocupacional</SelectItem>
                      <SelectItem value="burnout">Burnout</SelectItem>
                      <SelectItem value="engagement">Engajamento</SelectItem>
                      <SelectItem value="custom">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!selectedInstrument && (
                  <div>
                    <Label htmlFor="questions">Perguntas (JSON)</Label>
                    <Textarea
                      id="questions"
                      value={form.questions}
                      onChange={(e) => setForm({ ...form, questions: e.target.value })}
                      placeholder='[{"text": "Pergunta...", "type": "scale", "dimension": "Dimensão", "options": [1,2,3,4,5]}]'
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <Button variant="ghost" onClick={() => { setDialogMode("select"); }}>
                    Voltar
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Pesquisa
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
