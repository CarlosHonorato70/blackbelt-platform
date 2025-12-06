/**
 * PDF Export Component
 * Allows users to generate and download/email PDFs
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Download, Mail, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PdfExportProps {
  documentType: "proposal" | "assessment";
  documentId: string;
  documentNumber: string;
  defaultData: any;
  defaultBranding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
  };
}

export function PdfExport({
  documentType,
  documentId,
  documentNumber,
  defaultData,
  defaultBranding,
}: PdfExportProps) {
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: serviceStatus } = trpc.pdfExports.isAvailable.useQuery();

  const generateProposal = trpc.pdfExports.generateProposal.useMutation({
    onSuccess: (data) => {
      toast.success("PDF gerado com sucesso!");

      if (data.url) {
        // Open URL in new tab
        window.open(data.url, "_blank");
      } else if (data.pdfBase64) {
        // Download from base64
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = data.filename;
        link.click();
      }

      if (data.emailSent) {
        toast.success("Email enviado com sucesso!");
      }

      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar PDF: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const generateAssessment = trpc.pdfExports.generateAssessment.useMutation({
    onSuccess: (data) => {
      toast.success("PDF gerado com sucesso!");

      if (data.url) {
        window.open(data.url, "_blank");
      } else if (data.pdfBase64) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = data.filename;
        link.click();
      }

      if (data.emailSent) {
        toast.success("Email enviado com sucesso!");
      }

      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar PDF: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const handleGenerate = async () => {
    if (sendEmail && !emailTo) {
      toast.error("Por favor, insira um endereço de email");
      return;
    }

    setIsGenerating(true);

    try {
      if (documentType === "proposal") {
        await generateProposal.mutateAsync({
          proposalId: documentId,
          data: defaultData,
          branding: defaultBranding,
          sendEmail,
          emailTo: sendEmail ? emailTo : undefined,
        });
      } else {
        await generateAssessment.mutateAsync({
          assessmentId: documentId,
          data: defaultData,
          branding: defaultBranding,
          sendEmail,
          emailTo: sendEmail ? emailTo : undefined,
        });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!serviceStatus) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const canEmail = serviceStatus.emailDelivery;
  const hasS3 = serviceStatus.s3Storage;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Exportar para PDF
        </CardTitle>
        <CardDescription>
          Gere um PDF profissional do seu{" "}
          {documentType === "proposal" ? "orçamento" : "relatório"} #{documentNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasS3 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Armazenamento temporário</p>
              <p className="text-xs mt-1">
                PDFs serão baixados diretamente. Configure AWS S3 para armazenamento persistente.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="send-email"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
              disabled={!canEmail}
            />
            <Label htmlFor="send-email" className="text-sm font-medium">
              Enviar por email
            </Label>
          </div>
          {!canEmail && (
            <span className="text-xs text-muted-foreground">
              Configure SMTP para habilitar
            </span>
          )}
        </div>

        {sendEmail && (
          <div className="space-y-2">
            <Label htmlFor="email-to">Endereço de email</Label>
            <Input
              id="email-to"
              type="email"
              placeholder="cliente@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (sendEmail && !emailTo)}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : sendEmail ? (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Gerar e Enviar
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Gerar PDF
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• PDFs incluem branding personalizado (Enterprise)</p>
          <p>• URLs de download são válidas por 24 horas</p>
          <p>• Histórico disponível no painel de assinaturas</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PDF Export History Component
 * Shows list of previously generated PDFs
 */

interface PdfExportHistoryProps {
  documentType?: "proposal" | "assessment" | "report" | "invoice" | "contract";
  limit?: number;
}

export function PdfExportHistory({ documentType, limit = 10 }: PdfExportHistoryProps) {
  const { data: exports, isLoading } = trpc.pdfExports.listExports.useQuery({
    documentType,
    limit,
  });

  const trackDownload = trpc.pdfExports.trackDownload.useMutation();

  const handleDownload = async (pdfExport: any) => {
    if (pdfExport.url) {
      await trackDownload.mutateAsync({ id: pdfExport.id });
      window.open(pdfExport.url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!exports || exports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Exportações</CardTitle>
          <CardDescription>Nenhuma exportação encontrada</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Exportações</CardTitle>
        <CardDescription>{exports.length} exportações recentes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {exports.map((pdfExport) => (
            <div
              key={pdfExport.id}
              className="flex items-center justify-between p-3 border rounded-md"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{pdfExport.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(pdfExport.createdAt).toLocaleDateString("pt-BR")} •{" "}
                    {(pdfExport.fileSize / 1024).toFixed(0)} KB
                    {pdfExport.downloadCount > 0 && ` • ${pdfExport.downloadCount} downloads`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pdfExport.emailSent && (
                  <Mail className="h-4 w-4 text-green-600" title="Enviado por email" />
                )}
                {pdfExport.status === "completed" && pdfExport.url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(pdfExport)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {pdfExport.status === "failed" && (
                  <span className="text-xs text-destructive">Falhou</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
