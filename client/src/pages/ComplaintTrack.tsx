import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldCheck, Clock, CheckCircle, AlertTriangle, Archive, ArrowLeft } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  received: { label: "Recebida", color: "bg-blue-100 text-blue-800", icon: Clock },
  investigating: { label: "Em Analise", color: "bg-yellow-100 text-yellow-800", icon: Search },
  resolved: { label: "Resolvida", color: "bg-green-100 text-green-800", icon: CheckCircle },
  dismissed: { label: "Arquivada", color: "bg-gray-100 text-gray-800", icon: Archive },
};

const CATEGORY_MAP: Record<string, string> = {
  assedio_moral: "Assédio Moral",
  assedio_sexual: "Assédio Sexual",
  discrimination: "Discriminação",
  condicoes_trabalho: "Condições de Trabalho",
  violencia_psicologica: "Violência Psicológica",
  other: "Outros",
  harassment: "Assedio",
  violence: "Violencia",
  workload: "Sobrecarga",
  leadership: "Lideranca",
};

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-green-100 text-green-800" },
  medium: { label: "Média", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  critical: { label: "Crítica", color: "bg-red-100 text-red-800" },
};

export default function ComplaintTrack() {
  const { toast } = useToast();
  const [protocol, setProtocol] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const { data: result, isLoading, error } = trpc.anonymousReports.getByProtocol.useQuery(
    { reportCode: searchCode },
    { enabled: !!searchCode, retry: false }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = protocol.trim().toUpperCase();
    if (!trimmed) {
      toast({ title: "Digite o número do protocolo", variant: "destructive" });
      return;
    }
    setSearchCode(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-lg mx-auto pt-4">
        {/* Back */}
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Consulta de Protocolo</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe o status da sua denuncia
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Buscar por Protocolo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="protocol" className="mb-2 block">Numero do Protocolo</Label>
                <Input
                  id="protocol"
                  placeholder="Ex: BB-2026-ABCD"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="font-mono text-lg"
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                <Search className="h-4 w-4" />
                {isLoading ? "Buscando..." : "Consultar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {searchCode && !isLoading && error && (
          <Card className="border-red-200">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">Protocolo não encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Verifique o número do protocolo e tente novamente.
              </p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Denúncia Encontrada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className={STATUS_MAP[result.status]?.color || "bg-gray-100"}>
                    {STATUS_MAP[result.status]?.label || result.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Categoria</p>
                  <p className="font-medium text-sm">
                    {CATEGORY_MAP[result.category] || result.category}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Gravidade</p>
                  <Badge className={SEVERITY_MAP[result.severity]?.color || "bg-gray-100"}>
                    {SEVERITY_MAP[result.severity]?.label || result.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Data de Registro</p>
                  <p className="font-medium text-sm">
                    {result.createdAt ? new Date(result.createdAt).toLocaleDateString("pt-BR") : "-"}
                  </p>
                </div>
              </div>

              {result.resolvedAt && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Data de Resolucao</p>
                  <p className="font-medium text-sm">
                    {new Date(result.resolvedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              {/* Status timeline */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Progresso</p>
                <div className="flex items-center gap-1">
                  {["received", "investigating", "resolved"].map((step, i) => {
                    const steps = ["received", "investigating", "resolved"];
                    const currentIdx = steps.indexOf(result.status);
                    const isActive = i <= currentIdx;
                    const isDismissed = result.status === "dismissed";
                    return (
                      <div key={step} className="flex-1">
                        <div
                          className={`h-2 rounded-full ${
                            isDismissed
                              ? "bg-gray-300"
                              : isActive
                              ? "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        />
                        <p className={`text-xs mt-1 ${isActive && !isDismissed ? "text-green-700 font-medium" : "text-muted-foreground"}`}>
                          {STATUS_MAP[step]?.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy note */}
        <div className="flex items-start gap-2 p-3 bg-white/50 rounded-lg mt-6 mb-8">
          <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Nenhum dado pessoal e solicitado para esta consulta.
            O número de protocolo é a única forma de rastreamento.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Black Belt Consultoria SST | contato@blackbeltconsultoria.com
        </p>
      </div>
    </div>
  );
}
