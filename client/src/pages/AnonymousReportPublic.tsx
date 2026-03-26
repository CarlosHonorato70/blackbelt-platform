import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle, CheckCircle, Copy } from "lucide-react";

const categories = [
  { value: "harassment", label: "Ass\u00e9dio (moral ou sexual)" },
  { value: "discrimination", label: "Discrimina\u00e7\u00e3o" },
  { value: "violence", label: "Viol\u00eancia no trabalho" },
  { value: "workload", label: "Sobrecarga de trabalho" },
  { value: "leadership", label: "Problemas de lideran\u00e7a" },
  { value: "other", label: "Outro" },
] as const;

const severities = [
  { value: "low", label: "Baixa", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "medium", label: "M\u00e9dia", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "high", label: "Alta", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "critical", label: "Cr\u00edtica", color: "bg-red-100 text-red-800 border-red-300" },
] as const;

export default function AnonymousReportPublic() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [email, setEmail] = useState("");
  const [reportCode, setReportCode] = useState<string | null>(null);

  const { data: invite, isLoading, error } = trpc.webhook.checkInviteStatus.useQuery(
    { inviteToken: token || "" },
    { enabled: !!token }
  );

  const submitReport = trpc.webhook.submitAnonymousReport.useMutation({
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
      toast({ title: "Preencha todos os campos obrigat\u00f3rios", variant: "destructive" });
      return;
    }
    submitReport.mutate({
      inviteToken: token || "",
      category: category as any,
      description,
      severity: severity as any,
      reporterEmail: email || undefined,
    });
  };

  const copyCode = () => {
    if (reportCode) {
      navigator.clipboard.writeText(reportCode);
      toast({ title: "C\u00f3digo copiado!" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Link inv\u00e1lido</h2>
            <p className="text-muted-foreground">Este link de den\u00fancia n\u00e3o \u00e9 v\u00e1lido ou expirou.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (reportCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Den\u00fancia Registrada</h2>
            <p className="text-muted-foreground mb-6">
              Sua den\u00fancia foi recebida e ser\u00e1 tratada com total sigilo.
            </p>
            <div className="bg-slate-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">C\u00f3digo de rastreamento:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-primary">{reportCode}</span>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Guarde este c\u00f3digo para acompanhar o status da sua den\u00fancia.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Canal de Den\u00fancia Confidencial</h1>
          <p className="text-muted-foreground mt-2">
            Sua identidade ser\u00e1 preservada. Den\u00fancias s\u00e3o tratadas com total sigilo.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrar Den\u00fancia</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category */}
              <div>
                <Label className="mb-2 block font-medium">Categoria *</Label>
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
                <Label htmlFor="desc" className="mb-2 block font-medium">Descreva a situa\u00e7\u00e3o *</Label>
                <Textarea
                  id="desc"
                  placeholder="Descreva o que aconteceu com o m\u00e1ximo de detalhes poss\u00edvel..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">M\u00ednimo 10 caracteres</p>
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
                  Apenas se desejar receber atualiza\u00e7\u00f5es sobre sua den\u00fancia
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitReport.isPending || !category || description.length < 10}
              >
                {submitReport.isPending ? "Enviando..." : "Enviar Den\u00fancia"}
              </Button>

              {/* Privacy note */}
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Esta den\u00fancia \u00e9 completamente an\u00f4nima. Seus dados pessoais n\u00e3o s\u00e3o
                  coletados nem vinculados \u00e0 den\u00fancia. Protegido pela LGPD.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4 pb-8">
          Black Belt Consultoria SST | contato@blackbeltconsultoria.com
        </p>
      </div>
    </div>
  );
}
