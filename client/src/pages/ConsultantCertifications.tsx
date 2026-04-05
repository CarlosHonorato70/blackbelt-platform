import { useState, useRef, useCallback } from "react";
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
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronUp,
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
  { value: "A1_DIGITAL", label: "Certificado Digital A1 (ICP-Brasil)" },
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [certType, setCertType] = useState("");
  const [registryNumber, setRegistryNumber] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [certPassword, setCertPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Smart detection: is the file a digital certificate?
  const isDigitalCert = file ? (file.name.endsWith(".p12") || file.name.endsWith(".pfx")) : false;

  const handleFileChange = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase();
      if (ext.endsWith(".p12") || ext.endsWith(".pfx")) {
        // Auto-configure for A1 certificate
        setCertType("A1_DIGITAL");
        setName(selectedFile.name.replace(/\.(p12|pfx)$/i, "").replace(/[_]/g, " "));
      }
    }
  }, []);

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
    setCertPassword("");
    setFile(null);
    setShowAdvanced(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }

    const isP12 = file.name.endsWith(".p12") || file.name.endsWith(".pfx");

    if (isP12 && !certPassword) {
      toast({
        title: "Senha obrigatória",
        description: "Informe a senha do certificado digital.",
        variant: "destructive",
      });
      return;
    }

    if (!isP12 && (!name || !certType)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e tipo da certificação.",
        variant: "destructive",
      });
      return;
    }

    // For A1, use auto-generated name if user didn't change it
    const uploadName = isP12 ? (name || "Certificado Digital A1") : name;
    const uploadType = isP12 ? "A1_DIGITAL" : certType;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", uploadName);
      formData.append("certType", uploadType);
      if (registryNumber) formData.append("registryNumber", registryNumber);
      if (issuer) formData.append("issuer", issuer);
      if (issuedAt) formData.append("issuedAt", issuedAt);
      if (expiresAt) formData.append("expiresAt", expiresAt);
      if (notes) formData.append("notes", notes);
      if (certPassword) formData.append("certPassword", certPassword);

      const res = await fetch("/api/certifications/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao enviar arquivo");
      }

      const result = await res.json();
      toast({
        title: result.isSigningCert ? "Certificado A1 configurado!" : "Certificação enviada!",
        description: result.isSigningCert
          ? `${result.certSubject || name} — Assinatura digital ativada automaticamente.`
          : `${name} foi adicionada com sucesso.`,
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
                {isDigitalCert ? <ShieldCheck className="h-5 w-5 text-blue-600" /> : <Upload className="h-5 w-5" />}
                {isDigitalCert ? "Configurar Assinatura Digital" : "Adicionar Certificação"}
              </DialogTitle>
              <DialogDescription>
                {isDigitalCert
                  ? "Selecione o arquivo .p12 ou .pfx e informe a senha. O restante é configurado automaticamente."
                  : "Selecione o arquivo e preencha os dados. Para certificados A1, basta arrastar o arquivo .p12/.pfx."
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Step 1: File — always visible */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) {
                    handleFileChange(droppedFile);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.p12,.pfx"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {isDigitalCert ? <Lock className="h-8 w-8 text-blue-600" /> : <FileText className="h-8 w-8 text-primary" />}
                    <div className="text-left">
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} — Clique para trocar</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, P12 ou PFX (máx. 10MB)</p>
                  </div>
                )}
              </div>

              {/* A1 DIGITAL: simplified — just password */}
              {isDigitalCert && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-medium text-sm">Certificado Digital A1 detectado</span>
                    </div>
                    <div>
                      <Label htmlFor="cert-password" className="text-sm">
                        Senha do certificado <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="cert-password"
                        type="password"
                        placeholder="Digite a senha do arquivo .p12 / .pfx"
                        value={certPassword}
                        onChange={(e) => setCertPassword(e.target.value)}
                        className="mt-1"
                        autoFocus
                      />
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <p>O nome, emissor e validade serão extraídos automaticamente do certificado.</p>
                      <p>A senha é armazenada de forma criptografada (AES-256). Todos os PDFs da sua consultoria passarão a ter assinatura digital ICP-Brasil.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PROFESSIONAL CERT: type + name (simplified) */}
              {file && !isDigitalCert && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cert-type">
                        Tipo <span className="text-destructive">*</span>
                      </Label>
                      <Select value={certType} onValueChange={setCertType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CERT_TYPES.filter(t => t.value !== "A1_DIGITAL").map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                  </div>

                  <div>
                    <Label htmlFor="cert-name">
                      Nome / Descrição <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cert-name"
                      placeholder="Ex: CRP Ativo - Dr. Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Collapsible advanced fields */}
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Campos opcionais (emissor, datas, notas)
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-2 gap-4">
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
                          <Label htmlFor="cert-notes-field">Observações</Label>
                          <Input
                            id="cert-notes-field"
                            placeholder="Notas opcionais..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit button — only show after file is selected */}
              {file && (
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !file || (!isDigitalCert && (!name || !certType)) || (isDigitalCert && !certPassword)}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isDigitalCert ? "Validando certificado..." : "Enviando..."}
                    </>
                  ) : isDigitalCert ? (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Ativar Assinatura Digital
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Enviar Certificação
                    </>
                  )}
                </Button>
              )}
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
                          <div className="flex items-center gap-2">
                            {cert.name}
                            {(cert as any).isSigningCert && (
                              <Badge variant="default" className="bg-blue-600 text-xs">
                                Assinatura Digital
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cert.fileName} ({formatFileSize(cert.fileSize)})
                          </p>
                          {(cert as any).certSubject && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              CN: {(cert as any).certSubject}
                            </p>
                          )}
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
