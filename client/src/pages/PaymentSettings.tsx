import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, Banknote, FileText, Info, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pixKey, setPixKey] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  const { data, isLoading } = trpc.tenants.getPaymentSettings.useQuery();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (data) {
      setPixKey(data.pixKey ?? "");
      setBankDetails(data.bankDetails ?? "");
      setPaymentInstructions(data.paymentInstructions ?? "");
    }
  }, [data]);

  const saveMutation = trpc.tenants.updatePaymentSettings.useMutation({
    onSuccess: () => {
      toast({ title: "Configurações salvas!", description: "Dados de pagamento atualizados com sucesso." });
      utils.tenants.getPaymentSettings.invalidate();
    },
    onError: (err) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({ pixKey, bankDetails, paymentInstructions });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações de Pagamento</h1>
          <p className="text-muted-foreground mt-1">
            Estas informações são enviadas automaticamente por email quando uma empresa aprova uma proposta final.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Preencha pelo menos uma forma de recebimento (PIX ou dados bancários) para que as empresas saibam como efetuar o pagamento após aprovar a proposta.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4" />
            Chave PIX
          </CardTitle>
          <CardDescription>
            CPF, CNPJ, email, celular ou chave aleatória
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="pix">Chave PIX</Label>
            <Input
              id="pix"
              placeholder="Ex: 00.000.000/0001-00 ou consultoria@email.com"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4" />
            Dados Bancários
          </CardTitle>
          <CardDescription>
            Banco, agência, conta e tipo (para pagamentos via TED/DOC)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="bank">Dados Bancários</Label>
            <Textarea
              id="bank"
              placeholder={"Banco: Itaú (341)\nAgência: 1234\nConta: 56789-0\nTipo: Corrente\nFavorecido: Consultoria SST Ltda\nCNPJ: 00.000.000/0001-00"}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Instruções Adicionais
          </CardTitle>
          <CardDescription>
            Texto extra incluído no email de pagamento (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções</Label>
            <Textarea
              id="instructions"
              placeholder="Ex: Após o pagamento, envie o comprovante para financeiro@consultoria.com.br"
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
