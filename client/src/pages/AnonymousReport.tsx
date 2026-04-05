import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { ShieldAlert, Loader2, CheckCircle2, Copy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AnonymousReport() {
  usePageMeta({ title: "Canal de Denúncias" });
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();
  const { data: user } = trpc.auth.me.useQuery();
  const tenantId = (typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id) || user?.tenantId;

  const [form, setForm] = useState({
    category: "",
    description: "",
    severity: "medium",
    anonymous: true,
    email: "",
  });
  const [reportCode, setReportCode] = useState<string | null>(null);

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

  const submitMutation = trpc.anonymousReports.submit.useMutation({
    onSuccess: (data: any) => {
      setReportCode(data.reportCode);
      toast.success("Denúncia enviada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao enviar denuncia");
    },
  });

  const handleSubmit = () => {
    if (!form.category) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Descreva a situacao");
      return;
    }
    submitMutation.mutate({
      tenantId,
      category: form.category as any,
      description: form.description,
      severity: form.severity as any,
      reporterEmail: form.anonymous ? undefined : form.email || undefined,
    });
  };

  const handleCopyCode = () => {
    if (reportCode) {
      navigator.clipboard.writeText(reportCode);
      toast.success("Código copiado!");
    }
  };

  if (reportCode) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center space-y-6">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <div>
                <h2 className="text-xl font-bold mb-2">Denúncia Enviada</h2>
                <p className="text-muted-foreground">
                  Sua denúncia foi registrada com sucesso. Guarde este código para acompanhar sua denúncia.
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Código da Denúncia</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-bold tracking-wider">{reportCode}</code>
                  <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setReportCode(null);
                  setForm({ category: "", description: "", severity: "medium", anonymous: true, email: "" });
                }}
              >
                Enviar Outra Denúncia
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2">
              <ShieldAlert className="h-10 w-10 text-primary" />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-xl">Canal de Denúncias</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Registre situacoes de risco psicossocial de forma segura e confidencial.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assedio_moral">Assédio Moral</SelectItem>
                    <SelectItem value="assedio_sexual">Assédio Sexual</SelectItem>
                    <SelectItem value="discrimination">Discriminação</SelectItem>
                    <SelectItem value="condicoes_trabalho">Condições de Trabalho</SelectItem>
                    <SelectItem value="violencia_psicologica">Violência Psicológica</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descricao da Situacao *</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva a situacao com o maximo de detalhes possivel..."
                  rows={5}
                />
              </div>

              <div>
                <Label>Severidade</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={form.anonymous}
                  onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="anonymous" className="cursor-pointer">
                  Enviar de forma anonima
                </Label>
              </div>

              {!form.anonymous && (
                <div>
                  <Label htmlFor="email">E-mail para contato (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Denúncia
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
