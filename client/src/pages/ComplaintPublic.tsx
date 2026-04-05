import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle, CheckCircle, Copy, Search, ArrowLeft } from "lucide-react";

const categories = [
  { value: "assedio_moral", label: "Assédio Moral" },
  { value: "assedio_sexual", label: "Assédio Sexual" },
  { value: "discrimination", label: "Discriminação" },
  { value: "condicoes_trabalho", label: "Condições de Trabalho" },
  { value: "violencia_psicologica", label: "Violência Psicológica" },
  { value: "other", label: "Outros" },
] as const;

const severities = [
  { value: "low", label: "Baixa", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "medium", label: "Média", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "high", label: "Alta", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "critical", label: "Crítica", color: "bg-red-100 text-red-800 border-red-300" },
] as const;

export default function ComplaintPublic() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { toast } = useToast();

  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [email, setEmail] = useState("");
  const [reportCode, setReportCode] = useState<string | null>(null);

  const submitReport = trpc.anonymousReports.submit.useMutation({
    onSuccess: (data) => {
      setReportCode(data.reportCode);
    },
    onError: (err) => {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description || description.length < 10) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!tenantId) {
      toast({ title: "Empresa não identificada", variant: "destructive" });
      return;
    }
    submitReport.mutate({
      tenantId,
      category: category as any,
      description,
      severity: severity as any,
      reporterEmail: email || undefined,
    });
  };

  const copyCode = () => {
    if (reportCode) {
      navigator.clipboard.writeText(reportCode);
      toast({ title: "Código copiado!" });
    }
  };

  // Success state
  if (reportCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Denúncia Registrada</h2>
            <p className="text-muted-foreground mb-6">
              Sua denúncia foi recebida e será tratada com total sigilo.
            </p>
            <div className="bg-slate-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Número do protocolo:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-primary">{reportCode}</span>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Guarde este número para acompanhar o status da sua denúncia.
            </p>
            <Link to="/denuncia/consulta">
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                Consultar Status
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Back + Header */}
        <div className="pt-4">
          <Link to="/denuncia/consulta" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Consultar protocolo
          </Link>
        </div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Canal de Denúncia Confidencial</h1>
          <p className="text-muted-foreground mt-2">
            Sua identidade será preservada. Denúncias são tratadas com total sigilo.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrar Denúncia</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category */}
              <div>
                <Label className="mb-2 block font-medium">Tipo de Denúncia *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`p-3 text-sm rounded-lg border text-left transition-all ${
                        category === cat.value
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="desc" className="mb-2 block font-medium">Descreva a situacao *</Label>
                <Textarea
                  id="desc"
                  placeholder="Descreva o que aconteceu com o maximo de detalhes possivel..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Minimo 10 caracteres</p>
              </div>

              {/* Severity */}
              <div>
                <Label className="mb-2 block font-medium">Gravidade</Label>
                <div className="flex gap-2">
                  {severities.map((sev) => (
                    <button
                      key={sev.value}
                      type="button"
                      onClick={() => setSeverity(sev.value)}
                      className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-all ${
                        severity === sev.value
                          ? sev.color + " ring-2 ring-offset-1"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional email */}
              <div>
                <Label htmlFor="email" className="mb-2 block font-medium">
                  Email para retorno <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas se desejar receber atualizacoes sobre sua denuncia
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitReport.isPending || !category || description.length < 10}
              >
                {submitReport.isPending ? "Enviando..." : "Enviar Denúncia"}
              </Button>

              {/* Privacy note */}
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Esta denuncia e completamente anonima. Seus dados pessoais nao sao
                  coletados nem vinculados a denuncia. Protegido pela LGPD.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Link to track */}
        <div className="text-center mt-4 pb-8">
          <Link to="/denuncia/consulta" className="text-sm text-blue-600 hover:underline">
            Ja fez uma denuncia? Consulte o status aqui
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Black Belt Consultoria SST | contato@blackbeltconsultoria.com
        </p>
      </div>
    </div>
  );
}
