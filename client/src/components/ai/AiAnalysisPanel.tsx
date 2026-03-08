/**
 * AiAnalysisPanel — Exibe resultado da analise COPSOQ-II via IA.
 *
 * Permite gerar nova analise ou exibir analise existente com:
 * - Resumo executivo
 * - Dimensoes criticas
 * - Analise qualitativa (sentimento, temas, insights)
 * - Recomendacoes priorizadas
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AiAnalysisPanelProps {
  assessmentId: string;
  onAnalysisGenerated?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
  mixed: "Misto",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  mixed: "bg-purple-100 text-purple-800",
};

export default function AiAnalysisPanel({
  assessmentId,
  onAnalysisGenerated,
}: AiAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeMutation = (trpc as any).ai.analyzeCopsoq.useMutation({
    onSuccess: (data: any) => {
      setAnalysis(data.analysis);
      toast.success("Análise COPSOQ-II gerada com sucesso!", {
        description: `Modelo: Gemini 2.5 Flash`,
      });
      onAnalysisGenerated?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar análise: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    analyzeMutation.mutate({ assessmentId });
  };

  // Se ainda nao tem analise, mostrar botao
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Etapa 1: Análise COPSOQ-II via IA
          </CardTitle>
          <CardDescription>
            Gere uma análise completa das respostas COPSOQ-II utilizando
            inteligência artificial. A IA identificará dimensões críticas,
            temas emergentes e recomendações priorizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerate}
            disabled={analyzeMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando respostas...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Análise IA
              </>
            )}
          </Button>
          {analyzeMutation.isPending && (
            <p className="text-sm text-muted-foreground mt-2">
              Isso pode levar alguns segundos. A IA está processando todas as
              respostas da avaliação.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Exibir analise completa
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Etapa 1: Análise COPSOQ-II
            </CardTitle>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              <Sparkles className="w-3 h-3 mr-1" />
              Gerado por IA
            </Badge>
          </div>
          <CardDescription>
            Análise gerada automaticamente a partir das respostas da avaliação
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Resumo Executivo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo Executivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.executiveSummary}</p>
        </CardContent>
      </Card>

      {/* Dimensoes Criticas */}
      {analysis.criticalDimensions && analysis.criticalDimensions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Dimensões Críticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.criticalDimensions.map((dim: any, i: number) => (
              <div
                key={i}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{dim.dimension}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={SEVERITY_COLORS[dim.severity] || ""}
                    >
                      {SEVERITY_LABELS[dim.severity] || dim.severity}
                    </Badge>
                    <span className="text-sm font-bold">{dim.score}/100</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{dim.analysis}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Analise Qualitativa */}
      {analysis.qualitativeAnalysis && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Análise Qualitativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sentimento */}
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Sentimento Geral
              </span>
              <Badge
                className={`ml-2 ${
                  SENTIMENT_COLORS[analysis.qualitativeAnalysis.sentiment] || ""
                }`}
              >
                {SENTIMENT_LABELS[analysis.qualitativeAnalysis.sentiment] ||
                  analysis.qualitativeAnalysis.sentiment}
              </Badge>
            </div>

            {/* Temas Emergentes */}
            {analysis.qualitativeAnalysis.emergentThemes?.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Temas Emergentes
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {analysis.qualitativeAnalysis.emergentThemes.map(
                    (theme: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Insights */}
            {analysis.qualitativeAnalysis.keyInsights?.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Insights Principais
                </span>
                <ul className="mt-1 space-y-1">
                  {analysis.qualitativeAnalysis.keyInsights.map(
                    (insight: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {insight}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recomendacoes */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recomendações da IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.recommendations
              .sort((a: any, b: any) => a.priority - b.priority)
              .map((rec: any, i: number) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={
                        rec.priority <= 2
                          ? "bg-red-50 text-red-700 border-red-200"
                          : rec.priority === 3
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }
                    >
                      P{rec.priority}
                    </Badge>
                    <span className="font-medium text-sm">{rec.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rec.description}
                  </p>
                  {rec.expectedImpact && (
                    <p className="text-xs text-green-700 mt-1">
                      Impacto: {rec.expectedImpact}
                    </p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
