import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Shield, Download, Trash2, FileText, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  processando: "bg-blue-100 text-blue-800",
  completo: "bg-green-100 text-green-800",
  erro: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  export: "Exportação",
  delete: "Exclusão",
  rectify: "Retificação",
};

export default function AdminDsrManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exportResult, setExportResult] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const listQuery = (trpc as any).dataExport.adminList.useQuery(
    statusFilter === "all" ? undefined : { status: statusFilter },
    { refetchInterval: 10000 }
  );

  const processExportMut = (trpc as any).dataExport.processExport.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "Exportação concluída", description: `Tamanho: ${data.fileSize}` });
      setExportResult(data.data);
      setShowExportDialog(true);
      listQuery.refetch();
    },
    onError: (e: any) => toast({ title: "Erro na exportação", description: e.message, variant: "destructive" }),
  });

  const processDeletionMut = (trpc as any).dataExport.processDeletion.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "Exclusão concluída", description: `${data.deletedCount} categorias processadas` });
      listQuery.refetch();
    },
    onError: (e: any) => toast({ title: "Erro na exclusão", description: e.message, variant: "destructive" }),
  });

  const requests = listQuery.data || [];

  const handleDownloadJson = () => {
    if (!exportResult) return;
    const blob = new Blob([JSON.stringify(exportResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsr-export-${exportResult.dataSubject}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Gerenciar DSR (LGPD)
          </h1>
          <p className="text-muted-foreground">Processar solicitações de direitos do titular de dados</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Solicitações DSR</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="completo">Completo</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma solicitação encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">ID</th>
                    <th className="text-left py-3 px-2">Email</th>
                    <th className="text-left py-3 px-2">Tipo</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Data</th>
                    <th className="text-left py-3 px-2">Tamanho</th>
                    <th className="text-left py-3 px-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-xs max-w-[120px] truncate" title={r.id}>{r.id}</td>
                      <td className="py-3 px-2">{r.email}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{typeLabels[r.requestType] || r.requestType}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
                      </td>
                      <td className="py-3 px-2 text-xs">
                        {r.requestDate ? new Date(r.requestDate).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="py-3 px-2 text-xs">{r.fileSize || "-"}</td>
                      <td className="py-3 px-2">
                        {r.status === "pendente" && (
                          <div className="flex gap-1">
                            {(r.requestType === "export" || r.requestType === "rectify") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => processExportMut.mutate({ id: r.id })}
                                disabled={processExportMut.isPending}
                              >
                                {processExportMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                <span className="ml-1">Exportar</span>
                              </Button>
                            )}
                            {r.requestType === "delete" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja processar a exclusão dos dados? Esta ação é irreversível.")) {
                                    processDeletionMut.mutate({ id: r.id });
                                  }
                                }}
                                disabled={processDeletionMut.isPending}
                              >
                                {processDeletionMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                <span className="ml-1">Excluir</span>
                              </Button>
                            )}
                          </div>
                        )}
                        {r.status === "erro" && r.errorMessage && (
                          <span className="text-xs text-red-600" title={r.errorMessage}>Erro: {r.errorMessage.slice(0, 40)}</span>
                        )}
                        {r.status === "completo" && r.requestType === "export" && (
                          <Badge variant="outline" className="text-green-700">
                            <FileText className="h-3 w-3 mr-1" /> {r.fileSize}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Exportação</DialogTitle>
          </DialogHeader>
          {exportResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Titular: {exportResult.dataSubject} | Data: {new Date(exportResult.exportDate).toLocaleString("pt-BR")}
                </p>
                <Button size="sm" onClick={handleDownloadJson}>
                  <Download className="h-4 w-4 mr-1" /> Baixar JSON
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-[50vh]">
                {JSON.stringify(exportResult, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
