import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  Award,
  Download,
  Loader2,
  ShieldCheck,
  Calendar,
  Hash,
  BarChart3,
} from "lucide-react";

export default function ComplianceCertificate() {
  usePageMeta({ title: "Certificado de Conformidade" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

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

  const listQuery = trpc.complianceCertificate.list.useQuery({ tenantId });
  const issueMutation = trpc.complianceCertificate.issue.useMutation({
    onSuccess: () => {
      toast.success("Certificado emitido com sucesso!");
      listQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao emitir certificado");
    },
  });

  const certificates = listQuery.data ?? [];
  const latestCertificate = certificates.length > 0 ? certificates[0] : null;

  function handleDownloadPdf() {
    toast.info("PDF em desenvolvimento");
  }

  function isValid(cert: any): boolean {
    if (!cert.validUntil) return false;
    return new Date(cert.validUntil) > new Date();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Certificado de Conformidade</h1>
            <p className="text-muted-foreground">
              Emita e gerencie certificados de conformidade NR-01
            </p>
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !latestCertificate ? (
          /* No certificate - show issue card */
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <ShieldCheck className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-bold mb-2">Emitir Certificado de Conformidade</h2>
              <p className="text-muted-foreground mb-6">
                Para emitir o certificado, é necessário um score de conformidade igual ou superior a 80%.
              </p>
              <Button
                size="lg"
                onClick={() => issueMutation.mutate({ tenantId: tenantId! })}
                disabled={issueMutation.isPending}
              >
                {issueMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Award className="h-4 w-4 mr-2" />
                )}
                Emitir Certificado
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Certificate exists - show ornamental card */
          <div className="max-w-2xl mx-auto">
            <Card className="border-4 border-yellow-500/60 shadow-lg">
              <div className="bg-gradient-to-b from-yellow-50 to-white">
                <CardContent className="p-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <Award className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
                    <h2 className="text-2xl font-bold text-yellow-900 uppercase tracking-widest">
                      Certificado de Conformidade
                    </h2>
                    <p className="text-sm text-yellow-700 mt-2 uppercase tracking-wide">
                      Norma Regulamentadora NR-01
                    </p>
                    <div className="w-24 h-0.5 bg-yellow-500 mx-auto mt-4" />
                  </div>

                  {/* Certificate Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Número</p>
                        <p className="font-semibold">
                          {latestCertificate.certificateNumber ?? latestCertificate.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Data de Emissão</p>
                        <p className="font-semibold">
                          {latestCertificate.issuedAt
                            ? new Date(latestCertificate.issuedAt).toLocaleDateString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Válido até</p>
                        <p className="font-semibold">
                          {latestCertificate.validUntil
                            ? new Date(latestCertificate.validUntil).toLocaleDateString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">
                          Score de Conformidade
                        </p>
                        <p className="font-semibold">
                          {latestCertificate.complianceScore != null
                            ? `${Math.round(latestCertificate.complianceScore)}%`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-center mb-6">
                    {isValid(latestCertificate) ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-lg px-6 py-2">
                        <ShieldCheck className="h-5 w-5 mr-2" />
                        Válido
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 border-red-300 text-lg px-6 py-2">
                        Expirado
                      </Badge>
                    )}
                  </div>

                  {/* Download Button */}
                  <div className="text-center">
                    <Button variant="outline" onClick={handleDownloadPdf}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Issue new certificate button */}
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={() => issueMutation.mutate({ tenantId: tenantId! })}
                disabled={issueMutation.isPending}
              >
                {issueMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Award className="h-4 w-4 mr-2" />
                )}
                Emitir Novo Certificado
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
