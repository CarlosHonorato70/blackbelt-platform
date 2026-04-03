import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  Upload,
  Loader2,
  FileText,
  Download,
  Trash2,
  Plus,
  Calendar,
  Building2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

const CERT_TYPES = [
  { value: "CRP", label: "CRP - Conselho Regional de Psicologia" },
  { value: "CREA", label: "CREA - Conselho Regional de Engenharia" },
  { value: "CRM", label: "CRM - Conselho Regional de Medicina" },
  { value: "CRN", label: "CRN - Conselho Regional de Nutrição" },
  { value: "CREF", label: "CREF - Conselho Regional de Educação Física" },
  { value: "ISO_45001", label: "ISO 45001 - Saúde e Segurança Ocupacional" },
  { value: "ISO_9001", label: "ISO 9001 - Gestão da Qualidade" },
  { value: "NR_CERT", label: "Certificação NR (Norma Regulamentadora)" },
  { value: "MBA", label: "MBA / Pós-Graduação" },
  { value: "ESPECIALIZACAO", label: "Especialização Profissional" },
  { value: "OUTRO", label: "Outro" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExpired(expiresAt: string | Date | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function isExpiringSoon(expiresAt: string | Date | null | undefined) {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 30;
}

export default function ConsultantCertifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [certType, setCertType] = useState("");
  const [registryNumber, setRegistryNumber] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: certifications, isLoading } =
    trpc.consultantCertifications.list.useQuery();

  const downloadMutation =
    trpc.consultantCertifications.getDownloadUrl.useMutation({
      onSuccess: (data) => {
        window.open(data.url, "_blank");
      },
      onError: (err) => {
        toast({
          title: "Erro",
          description: err.message,
          variant: "destructive",
        });
      },
    });

  const deleteMutation = trpc.consultantCertifications.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Certificação removida" });
      utils.consultantCertifications.list.invalidate();
    },
    onError: (err) => {
      toast({
        title: "Erro ao remover",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setCertType("");
    setRegistryNumber("");
    setIssuer("");
    setIssuedAt("");
    setExpiresAt("");
    setNotes("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || !name || !certType) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome, tipo e selecione um arquivo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("certType", certType);
      if (registryNumber) formData.append("registryNumber", registryNumber);
      if (issuer) formData.append("issuer", issuer);
      if (issuedAt) formData.append("issuedAt", issuedAt);
      if (expiresAt) formData.append("expiresAt", expiresAt);
      if (notes) formData.append("notes", notes);

      const res = await fetch("/api/certifications/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao enviar arquivo");
      }

      toast({
        title: "Certificação enviada!",
        description: `${name} foi adicionada com sucesso.`,
      });
      resetForm();
      setDialogOpen(false);
      utils.consultantCertifications.list.invalidate();
    } catch (err) {
      toast({
        title: "Erro no upload",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const expiredCount =
    certifications?.filter((c) => isExpired(c.expiresAt)).length ?? 0;
  const expiringSoonCount =
    certifications?.filter((c) => isExpiringSoon(c.expiresAt)).length ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Certificações Profissionais
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as certificações e registros profissionais da sua
              consultoria.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Certificação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Adicionar Certificação
              </DialogTitle>
              <DialogDescription>
                Faça upload do documento da certificação. Aceita PDF, JPG e PNG
                (máx. 10MB).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* File upload */}
              <div>
                <Label htmlFor="cert-file">
                  Arquivo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cert-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 cursor-pointer"
                />
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cert-name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cert-name"
                    placeholder="Ex: CRP Ativo - Dr. Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-type">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select value={certType} onValueChange={setCertType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CERT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cert-registry">Número de Registro</Label>
                  <Input
                    id="cert-registry"
                    placeholder="Ex: CRP 06/12345"
                    value={registryNumber}
                    onChange={(e) => setRegistryNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-issuer">Órgão Emissor</Label>
                  <Input
                    id="cert-issuer"
                    placeholder="Ex: CRP São Paulo"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cert-issued">Data de Emissão</Label>
                  <Input
                    id="cert-issued"
                    type="date"
                    value={issuedAt}
                    onChange={(e) => setIssuedAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-expires">Data de Validade</Label>
                  <Input
                    id="cert-expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cert-notes">Observações</Label>
                <Textarea
                  id="cert-notes"
                  placeholder="Notas adicionais sobre esta certificação..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading || !file || !name || !certType}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Certificação
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert for expiring/expired certs */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {expiredCount > 0 && (
                <span className="font-medium">
                  {expiredCount} certificação(ões) vencida(s).{" "}
                </span>
              )}
              {expiringSoonCount > 0 && (
                <span>
                  {expiringSoonCount} certificação(ões) vencendo nos próximos 30
                  dias.
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Certificações</CardDescription>
            <CardTitle className="text-3xl">
              {certifications?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vigentes</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {certifications?.filter(
                (c) => !isExpired(c.expiresAt) && c.status === "active"
              ).length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vencidas / A Vencer</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {expiredCount + expiringSoonCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificações Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!certifications || certifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                Nenhuma certificação cadastrada ainda
              </p>
              <p className="text-sm mt-1">
                Clique em "Nova Certificação" para adicionar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Emissor</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certifications.map((cert) => {
                    const expired = isExpired(cert.expiresAt);
                    const expiring = isExpiringSoon(cert.expiresAt);
                    const typeLabel =
                      CERT_TYPES.find((t) => t.value === cert.certType)
                        ?.label?.split(" - ")[0] ?? cert.certType;

                    return (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          {cert.name}
                          <p className="text-xs text-muted-foreground">
                            {cert.fileName} ({formatFileSize(cert.fileSize)})
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{typeLabel}</Badge>
                        </TableCell>
                        <TableCell>{cert.registryNumber || "—"}</TableCell>
                        <TableCell>{cert.issuer || "—"}</TableCell>
                        <TableCell>
                          {cert.expiresAt ? (
                            <span
                              className={
                                expired
                                  ? "text-destructive font-medium"
                                  : expiring
                                    ? "text-amber-600 font-medium"
                                    : ""
                              }
                            >
                              {formatDate(cert.expiresAt)}
                              {expired && " (vencida)"}
                              {expiring && " (vencendo)"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Sem validade
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {expired ? (
                            <Badge variant="destructive">Vencida</Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Ativa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Baixar arquivo"
                              onClick={() =>
                                downloadMutation.mutate({ id: cert.id })
                              }
                              disabled={downloadMutation.isPending}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remover"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Remover certificação "${cert.name}"?`
                                  )
                                ) {
                                  deleteMutation.mutate({ id: cert.id });
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Por que cadastrar certificações?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            As certificações ficam vinculadas ao perfil da sua consultoria e
            podem ser apresentadas nas propostas comerciais, laudos técnicos e
            documentos entregáveis da NR-01.
          </p>
          <p>
            Mantenha os registros atualizados para garantir conformidade e
            credibilidade junto aos seus clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
