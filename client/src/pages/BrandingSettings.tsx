import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Upload, ExternalLink, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBranding } from "@/contexts/BrandingContext";

/**
 * Phase 5: Branding Settings Page (Enterprise)
 * 
 * Allows Enterprise customers to customize:
 * - Logo and favicon
 * - Primary and secondary brand colors
 * - Custom domain configuration
 * - Email sender customization
 */

export default function BrandingSettings() {
  const { toast } = useToast();
  const branding = useBranding();
  const utils = trpc.useUtils();

  const { data: brandingData, isLoading } = trpc.branding.getBranding.useQuery();
  
  // Form state
  const [logoUrl, setLogoUrl] = useState(brandingData?.logoUrl || "");
  const [faviconUrl, setFaviconUrl] = useState(brandingData?.faviconUrl || "");
  const [primaryColor, setPrimaryColor] = useState(
    brandingData?.primaryColor || "#3b82f6"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    brandingData?.secondaryColor || "#10b981"
  );
  const [emailSenderName, setEmailSenderName] = useState(
    brandingData?.emailSenderName || ""
  );
  const [emailSenderEmail, setEmailSenderEmail] = useState(
    brandingData?.emailSenderEmail || ""
  );

  // Update form when data loads
  useEffect(() => {
    if (brandingData) {
      setLogoUrl(brandingData.logoUrl || "");
      setFaviconUrl(brandingData.faviconUrl || "");
      setPrimaryColor(brandingData.primaryColor || "#3b82f6");
      setSecondaryColor(brandingData.secondaryColor || "#10b981");
      setEmailSenderName(brandingData.emailSenderName || "");
      setEmailSenderEmail(brandingData.emailSenderEmail || "");
    }
  }, [brandingData]);

  const updateMutation = trpc.branding.updateBranding.useMutation({
    onSuccess: () => {
      toast({
        title: "Branding atualizado!",
        description: "Suas configurações de marca foram salvas com sucesso.",
      });
      utils.branding.getBranding.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      logoUrl: logoUrl || undefined,
      faviconUrl: faviconUrl || undefined,
      primaryColor,
      secondaryColor,
      emailSenderName: emailSenderName || undefined,
      emailSenderEmail: emailSenderEmail || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Crown className="h-8 w-8 text-yellow-500" />
          Personalização White-Label
        </h1>
        <p className="text-muted-foreground mt-2">
          Customize a aparência da plataforma com sua identidade visual (Recurso Enterprise)
        </p>
      </div>

      {!branding.whiteLabelEnabled && (
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            A personalização White-Label está disponível apenas para planos Enterprise.
            <a href="/subscription/pricing" className="ml-2 underline">
              Faça upgrade agora
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Logo e Favicon */}
      <Card>
        <CardHeader>
          <CardTitle>Logo e Ícone</CardTitle>
          <CardDescription>
            Configure o logo e favicon da sua marca
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL do Logo</Label>
            <div className="flex gap-2">
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
                className="flex-1"
              />
              {logoUrl && (
                <a
                  href={logoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {logoUrl && (
              <div className="mt-2 p-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="max-h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="faviconUrl">URL do Favicon</Label>
            <div className="flex gap-2">
              <Input
                id="faviconUrl"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://exemplo.com/favicon.ico"
                className="flex-1"
              />
              {faviconUrl && (
                <a
                  href={faviconUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {faviconUrl && (
              <div className="mt-2 p-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img
                  src={faviconUrl}
                  alt="Favicon preview"
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cores da Marca */}
      <Card>
        <CardHeader>
          <CardTitle>Cores da Marca</CardTitle>
          <CardDescription>
            Defina as cores primária e secundária do seu tema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 font-mono"
                />
              </div>
              <div
                className="mt-2 h-16 rounded-md border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#10b981"
                  className="flex-1 font-mono"
                />
              </div>
              <div
                className="mt-2 h-16 rounded-md border"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Email */}
      <Card>
        <CardHeader>
          <CardTitle>Remetente de Emails</CardTitle>
          <CardDescription>
            Personalize o nome e email de envio dos emails transacionais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailSenderName">Nome do Remetente</Label>
            <Input
              id="emailSenderName"
              value={emailSenderName}
              onChange={(e) => setEmailSenderName(e.target.value)}
              placeholder="Sua Empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailSenderEmail">Email do Remetente</Label>
            <Input
              id="emailSenderEmail"
              type="email"
              value={emailSenderEmail}
              onChange={(e) => setEmailSenderEmail(e.target.value)}
              placeholder="noreply@suaempresa.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Domínio Customizado */}
      <Card>
        <CardHeader>
          <CardTitle>Domínio Customizado</CardTitle>
          <CardDescription>
            Configure um domínio personalizado para sua instância
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomDomainConfig />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          size="lg"
        >
          {updateMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

/**
 * Custom Domain Configuration Component
 */
function CustomDomainConfig() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: branding } = trpc.branding.getBranding.useQuery();

  const [domain, setDomain] = useState("");

  const setDomainMutation = trpc.branding.setCustomDomain.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Domínio configurado!",
        description: data.message,
      });
      utils.branding.getBranding.invalidate();
      setDomain("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao configurar domínio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyMutation = trpc.branding.verifyCustomDomain.useMutation({
    onSuccess: (data) => {
      if (data.verified) {
        toast({
          title: "Domínio verificado!",
          description: data.message,
        });
      } else {
        toast({
          title: "Verificação falhou",
          description: data.message,
          variant: "destructive",
        });
      }
      utils.branding.getBranding.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Erro na verificação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = trpc.branding.removeCustomDomain.useMutation({
    onSuccess: () => {
      toast({
        title: "Domínio removido",
        description: "O domínio customizado foi removido com sucesso.",
      });
      utils.branding.getBranding.invalidate();
    },
  });

  const handleSetDomain = () => {
    if (!domain) return;
    setDomainMutation.mutate({ domain });
  };

  const handleVerify = () => {
    verifyMutation.mutate();
  };

  const handleRemove = () => {
    if (confirm("Tem certeza que deseja remover o domínio customizado?")) {
      removeMutation.mutate();
    }
  };

  return (
    <div className="space-y-4">
      {branding?.customDomain ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={branding.customDomain} readOnly className="flex-1" />
            {branding.customDomainVerified ? (
              <div className="flex items-center gap-1 text-green-600 px-3">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Verificado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-600 px-3">
                <X className="h-4 w-4" />
                <span className="text-sm font-medium">Pendente</span>
              </div>
            )}
          </div>

          {!branding.customDomainVerified && (
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">
                  Configure o seguinte registro DNS:
                </p>
                <code className="block bg-muted p-3 rounded text-sm">
                  Tipo: CNAME
                  <br />
                  Nome: {branding.customDomain}
                  <br />
                  Valor: app.blackbelt-platform.com
                  <br />
                  TTL: 3600
                </code>
                <p className="text-sm mt-2 text-muted-foreground">
                  Após configurar o DNS, aguarde alguns minutos e clique em
                  "Verificar".
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!branding.customDomainVerified && (
              <Button
                onClick={handleVerify}
                disabled={verifyMutation.isPending}
                variant="default"
              >
                {verifyMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Verificar DNS
              </Button>
            )}
            <Button
              onClick={handleRemove}
              disabled={removeMutation.isPending}
              variant="destructive"
            >
              {removeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Remover Domínio
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="seudominio.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSetDomain}
              disabled={setDomainMutation.isPending || !domain}
            >
              {setDomainMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Configurar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Digite um domínio sem "http://" ou "www" (ex: minhaempresa.com)
          </p>
        </div>
      )}
    </div>
  );
}
