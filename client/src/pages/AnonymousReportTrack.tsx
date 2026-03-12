import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  Search,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Tag,
  Info,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  under_review: { label: "Em Análise", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  investigating: { label: "Investigando", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  resolved: { label: "Resolvido", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  dismissed: { label: "Arquivado", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
};

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Assédio",
  discrimination: "Discriminação",
  safety: "Segurança",
  ethics: "Ética",
  fraud: "Fraude",
  workplace_violence: "Violência no Trabalho",
  other: "Outro",
};

export default function AnonymousReportTrack() {
  usePageMeta({ title: "Rastrear Denúncia" });
  const [reportCode, setReportCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const trackQuery = trpc.anonymousReports.trackByCode.useQuery(
    { reportCode: searchCode },
    { enabled: !!searchCode, retry: false }
  );

  const handleSearch = () => {
    if (!reportCode.trim()) return;
    setSearchCode(reportCode.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const report = trackQuery.data as any;
  const statusCfg = report ? STATUS_CONFIG[report.status] || STATUS_CONFIG.pending : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold">Rastrear Denúncia</h1>
            <p className="text-muted-foreground mt-1">
              Insira o código de rastreamento para acompanhar o status da sua denúncia
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="code" className="sr-only">
                    Código de Rastreamento
                  </Label>
                  <Input
                    id="code"
                    value={reportCode}
                    onChange={(e) => setReportCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite o código de rastreamento"
                    className="text-center text-lg tracking-wider"
                  />
                </div>
                <Button onClick={handleSearch} disabled={!reportCode.trim() || trackQuery.isFetching}>
                  {trackQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Rastrear Denúncia</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {searchCode && trackQuery.isError && (
            <Card className="border-yellow-200">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
                <p className="text-lg font-medium">Denúncia não encontrada</p>
                <p className="text-muted-foreground mt-1">
                  Verifique o código informado e tente novamente.
                </p>
              </CardContent>
            </Card>
          )}

          {report && statusCfg && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Detalhes da Denúncia
                </CardTitle>
                <CardDescription>Código: {searchCode}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Tag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <ShieldAlert className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Categoria</p>
                      <p className="font-medium">
                        {CATEGORY_LABELS[report.category] || report.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Criação</p>
                      <p className="font-medium">
                        {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {report.resolvedAt && (
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <Calendar className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data de Resolução</p>
                        <p className="font-medium">
                          {new Date(report.resolvedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
