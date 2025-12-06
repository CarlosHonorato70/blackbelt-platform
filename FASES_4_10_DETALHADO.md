# Fases 4-10: Guia Detalhado de Implementação

Este documento fornece um guia completo e detalhado para implementar as Fases 4 a 10 da comercialização da Black Belt Platform, incluindo especificações técnicas, arquitetura, código de exemplo e cronogramas.

---

## 📄 Fase 4: Exportação de Propostas em PDF (2 semanas)

### 🎯 Objetivo
Permitir que usuários exportem propostas comerciais em PDF com branding personalizado, facilitando o compartilhamento profissional de documentos.

### 🏗️ Arquitetura Técnica

#### Dependências
```bash
pnpm add pdfkit
pnpm add @types/pdfkit --save-dev
# ou alternativa com Puppeteer para HTML-to-PDF
pnpm add puppeteer
pnpm add @types/puppeteer --save-dev
```

#### Database Schema
```sql
-- Adicionar à migração existente
ALTER TABLE proposals ADD COLUMN pdf_url VARCHAR(500);
ALTER TABLE proposals ADD COLUMN pdf_generated_at TIMESTAMP;

-- Tabela para tracking de exports
CREATE TABLE pdf_exports (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  proposal_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_proposal (proposal_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### tRPC Router (`server/routers/pdfExport.ts`)
```typescript
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../_core/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const pdfExportRouter = router({
  /**
   * Gerar PDF de proposta com branding
   */
  exportProposal: protectedProcedure
    .input(z.object({
      proposalId: z.string(),
      includeBreakdown: z.boolean().default(true),
      includeLogo: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Verificar permissões
      const proposal = await db.query.proposals.findFirst({
        where: (proposals, { eq, and }) =>
          and(
            eq(proposals.id, input.proposalId),
            eq(proposals.tenantId, ctx.tenantId)
          ),
        with: {
          tenant: true,
          items: true,
          assessment: {
            with: {
              company: true,
            },
          },
        },
      });

      if (!proposal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' });
      }

      // Gerar PDF
      const pdfBuffer = await generateProposalPDF(proposal, {
        includeBreakdown: input.includeBreakdown,
        includeLogo: input.includeLogo,
        tenantBranding: proposal.tenant.logoUrl ? {
          logoUrl: proposal.tenant.logoUrl,
          primaryColor: proposal.tenant.primaryColor || '#3b82f6',
          secondaryColor: proposal.tenant.secondaryColor || '#10b981',
        } : undefined,
      });

      // Upload para S3
      const fileName = `proposals/${ctx.tenantId}/${input.proposalId}/${nanoid()}.pdf`;
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }));

      const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${fileName}`;

      // Salvar no banco
      await db.insert(pdfExports).values({
        id: nanoid(),
        tenantId: ctx.tenantId,
        proposalId: input.proposalId,
        userId: ctx.userId,
        fileUrl,
        fileSize: pdfBuffer.length,
      });

      await db.update(proposals)
        .set({
          pdfUrl: fileUrl,
          pdfGeneratedAt: new Date(),
        })
        .where(eq(proposals.id, input.proposalId));

      return {
        url: fileUrl,
        size: pdfBuffer.length,
      };
    }),

  /**
   * Listar histórico de exports
   */
  listExports: protectedProcedure
    .input(z.object({
      proposalId: z.string().optional(),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const where = input.proposalId
        ? and(
            eq(pdfExports.tenantId, ctx.tenantId),
            eq(pdfExports.proposalId, input.proposalId)
          )
        : eq(pdfExports.tenantId, ctx.tenantId);

      const exports = await db.query.pdfExports.findMany({
        where,
        limit: input.perPage,
        offset: (input.page - 1) * input.perPage,
        orderBy: (exports, { desc }) => [desc(exports.generatedAt)],
        with: {
          proposal: {
            columns: { clientName: true },
          },
          user: {
            columns: { name: true, email: true },
          },
        },
      });

      return exports;
    }),

  /**
   * Enviar PDF por email
   */
  emailProposal: protectedProcedure
    .input(z.object({
      proposalId: z.string(),
      recipientEmail: z.string().email(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Gerar PDF se não existir
      // Enviar via SendGrid/Postmark
      // Registrar envio
      // Retornar confirmação
    }),
});

async function generateProposalPDF(proposal: any, options: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header com logo (se disponível)
    if (options.includeLogo && options.tenantBranding?.logoUrl) {
      // Implementar carregamento e inserção de logo
    }

    // Título
    doc.fontSize(24)
       .fillColor(options.tenantBranding?.primaryColor || '#000')
       .text('Proposta Comercial', { align: 'center' });

    doc.moveDown();

    // Informações do cliente
    doc.fontSize(12).fillColor('#000');
    doc.text(`Cliente: ${proposal.assessment.company.name}`);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.text(`Validade: 30 dias`);

    doc.moveDown();

    // Resumo
    doc.fontSize(16).text('Resumo Executivo');
    doc.fontSize(12).text(proposal.summary || 'Proposta de serviços de consultoria em SST.');

    doc.moveDown();

    // Itens da proposta
    if (options.includeBreakdown && proposal.items.length > 0) {
      doc.fontSize(16).text('Itens da Proposta');
      doc.moveDown(0.5);

      proposal.items.forEach((item: any, index: number) => {
        doc.fontSize(12);
        doc.text(`${index + 1}. ${item.description}`);
        doc.text(`   Quantidade: ${item.quantity} ${item.unit}`);
        doc.text(`   Valor Unitário: R$ ${(item.unitPrice / 100).toFixed(2)}`);
        doc.text(`   Subtotal: R$ ${(item.totalPrice / 100).toFixed(2)}`);
        doc.moveDown(0.5);
      });
    }

    // Total
    doc.moveDown();
    doc.fontSize(16);
    doc.text(`Valor Total: R$ ${(proposal.totalPrice / 100).toFixed(2)}`, {
      align: 'right',
    });

    // Footer
    doc.fontSize(10)
       .fillColor('#666')
       .text(
         'Este documento foi gerado automaticamente pela Black Belt Platform.',
         50,
         doc.page.height - 50,
         { align: 'center' }
       );

    doc.end();
  });
}
```

#### Frontend Component (`client/src/components/proposal/ExportPDFButton.tsx`)
```typescript
import { Button } from "@/components/ui/button";
import { Download, Mail, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function ExportPDFButton({ proposalId }: { proposalId: string }) {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");

  const exportMutation = trpc.pdfExport.exportProposal.useMutation({
    onSuccess: (data) => {
      toast({
        title: "PDF gerado com sucesso!",
        description: "O arquivo está sendo baixado...",
      });
      window.open(data.url, '_blank');
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const emailMutation = trpc.pdfExport.emailProposal.useMutation({
    onSuccess: () => {
      toast({
        title: "Email enviado!",
        description: `PDF enviado para ${recipientEmail}`,
      });
      setEmailDialogOpen(false);
      setRecipientEmail("");
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => exportMutation.mutate({ proposalId })}
        disabled={exportMutation.isPending}
        variant="outline"
      >
        {exportMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Exportar PDF
      </Button>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Enviar por Email
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Proposta por Email</DialogTitle>
            <DialogDescription>
              Envie a proposta em PDF diretamente para o cliente
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email do destinatário</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Adicione uma mensagem personalizada..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() =>
              emailMutation.mutate({ proposalId, recipientEmail, message })
            }
            disabled={!recipientEmail || emailMutation.isPending}
          >
            {emailMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Enviar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### ✅ Checklist de Implementação

- [ ] Instalar pdfkit e tipos
- [ ] Criar migração para `pdf_exports`
- [ ] Implementar `pdfExportRouter` com 3 endpoints
- [ ] Criar função `generateProposalPDF` com template
- [ ] Configurar S3 para armazenamento
- [ ] Criar componente `ExportPDFButton`
- [ ] Adicionar botão na página de proposta
- [ ] Implementar envio por email (SendGrid)
- [ ] Testar geração com diferentes propostas
- [ ] Validar branding personalizado (Enterprise)
- [ ] Adicionar testes unitários
- [ ] Documentar uso

### 📦 Environment Variables

```env
# AWS S3 para armazenamento de PDFs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=blackbelt-pdfs

# SendGrid para envio de emails
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@blackbelt-platform.com
```

---

## 🎯 Fase 5: White-Label (Enterprise) (2-3 semanas)

### 🎯 Objetivo
Permitir que clientes Enterprise personalizem completamente a aparência da plataforma com logo, cores e domínio próprio.

### 🏗️ Arquitetura Técnica

#### Database Schema
```sql
-- Adicionar campos de branding ao tenant
ALTER TABLE tenants ADD COLUMN logo_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN favicon_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN primary_color VARCHAR(7) DEFAULT '#3b82f6';
ALTER TABLE tenants ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#10b981';
ALTER TABLE tenants ADD COLUMN custom_domain VARCHAR(255);
ALTER TABLE tenants ADD COLUMN custom_domain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN email_sender_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN email_sender_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN white_label_enabled BOOLEAN DEFAULT FALSE;

-- Índice para lookup por domínio customizado
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
```

#### tRPC Router (`server/routers/branding.ts`)
```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../_core/db';
import { requireFeature } from '../_core/subscriptionMiddleware';

export const brandingRouter = router({
  /**
   * Obter configurações de branding
   */
  getBranding: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.id, ctx.tenantId),
        columns: {
          logoUrl: true,
          faviconUrl: true,
          primaryColor: true,
          secondaryColor: true,
          customDomain: true,
          customDomainVerified: true,
          emailSenderName: true,
          emailSenderEmail: true,
          whiteLabelEnabled: true,
        },
      });

      return tenant;
    }),

  /**
   * Atualizar branding (requer Enterprise)
   */
  updateBranding: protectedProcedure
    .input(z.object({
      logoUrl: z.string().url().optional(),
      faviconUrl: z.string().url().optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      emailSenderName: z.string().max(255).optional(),
      emailSenderEmail: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFeature(ctx.tenantId, 'white_label');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await db.update(tenants)
        .set({
          ...input,
          whiteLabelEnabled: true,
        })
        .where(eq(tenants.id, ctx.tenantId));

      return { success: true };
    }),

  /**
   * Configurar domínio customizado
   */
  setCustomDomain: protectedProcedure
    .input(z.object({
      domain: z.string().regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFeature(ctx.tenantId, 'white_label');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Verificar se domínio já está em uso
      const existing = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.customDomain, input.domain),
      });

      if (existing && existing.id !== ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Domínio já está em uso',
        });
      }

      await db.update(tenants)
        .set({
          customDomain: input.domain,
          customDomainVerified: false,
        })
        .where(eq(tenants.id, ctx.tenantId));

      // Gerar registro DNS para verificação
      const dnsRecord = {
        type: 'CNAME',
        name: input.domain,
        value: 'app.blackbelt-platform.com',
      };

      return {
        success: true,
        dnsRecord,
        message: 'Configure o registro DNS e clique em "Verificar"',
      };
    }),

  /**
   * Verificar domínio customizado
   */
  verifyCustomDomain: protectedProcedure
    .mutation(async ({ ctx }) => {
      await requireFeature(ctx.tenantId, 'white_label');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.id, ctx.tenantId),
        columns: { customDomain: true },
      });

      if (!tenant?.customDomain) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhum domínio configurado' });
      }

      // Verificar DNS (implementação simplificada)
      const isVerified = await verifyDNS(tenant.customDomain);

      if (isVerified) {
        await db.update(tenants)
          .set({ customDomainVerified: true })
          .where(eq(tenants.id, ctx.tenantId));

        return { success: true, verified: true };
      } else {
        return {
          success: false,
          verified: false,
          message: 'DNS não configurado corretamente',
        };
      }
    }),
});

async function verifyDNS(domain: string): Promise<boolean> {
  // Implementar verificação DNS real com node:dns ou serviço externo
  const dns = require('dns').promises;
  try {
    const records = await dns.resolveCname(domain);
    return records.includes('app.blackbelt-platform.com');
  } catch {
    return false;
  }
}
```

#### Frontend - Branding Context (`client/src/contexts/BrandingContext.tsx`)
```typescript
import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  whiteLabelEnabled: boolean;
}

const BrandingContext = createContext<BrandingConfig | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: branding } = trpc.branding.getBranding.useQuery();
  const [config, setConfig] = useState<BrandingConfig>({
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    whiteLabelEnabled: false,
  });

  useEffect(() => {
    if (branding) {
      setConfig({
        logoUrl: branding.logoUrl,
        faviconUrl: branding.faviconUrl,
        primaryColor: branding.primaryColor || '#3b82f6',
        secondaryColor: branding.secondaryColor || '#10b981',
        whiteLabelEnabled: branding.whiteLabelEnabled || false,
      });

      // Aplicar cores CSS
      document.documentElement.style.setProperty('--primary', branding.primaryColor || '#3b82f6');
      document.documentElement.style.setProperty('--secondary', branding.secondaryColor || '#10b981');

      // Atualizar favicon
      if (branding.faviconUrl) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) link.href = branding.faviconUrl;
      }
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={config}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within BrandingProvider');
  return context;
}
```

#### Settings Page (`client/src/pages/settings/Branding.tsx`)
```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Upload, Check, X } from "lucide-react";

export function BrandingSettings() {
  const { toast } = useToast();
  const { data: branding } = trpc.branding.getBranding.useQuery();
  const updateMutation = trpc.branding.updateBranding.useMutation({
    onSuccess: () => {
      toast({ title: "Branding atualizado com sucesso!" });
    },
  });

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");

  const handleSave = () => {
    updateMutation.mutate({
      logoUrl,
      primaryColor,
      secondaryColor,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personalização (Enterprise)</CardTitle>
          <CardDescription>
            Customize a aparência da plataforma com sua identidade visual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo">Logo (URL)</Label>
            <Input
              id="logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primary"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <Input value={primaryColor} readOnly />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
                <Input value={secondaryColor} readOnly />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

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
    </div>
  );
}

function CustomDomainConfig() {
  const { data: branding } = trpc.branding.getBranding.useQuery();
  const [domain, setDomain] = useState("");
  const setDomainMutation = trpc.branding.setCustomDomain.useMutation();
  const verifyMutation = trpc.branding.verifyCustomDomain.useMutation();

  const handleSetDomain = () => {
    setDomainMutation.mutate({ domain });
  };

  const handleVerify = () => {
    verifyMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {branding?.customDomain ? (
        <div className="flex items-center gap-2">
          <Input value={branding.customDomain} readOnly />
          {branding.customDomainVerified ? (
            <Check className="text-green-500" />
          ) : (
            <>
              <X className="text-red-500" />
              <Button onClick={handleVerify} variant="outline">
                Verificar
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="seudominio.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Button onClick={handleSetDomain}>Configurar</Button>
        </div>
      )}

      {setDomainMutation.data && !branding?.customDomainVerified && (
        <div className="p-4 border rounded bg-muted">
          <p className="font-medium">Configure este registro DNS:</p>
          <code className="block mt-2">
            Tipo: {setDomainMutation.data.dnsRecord.type}
            <br />
            Nome: {setDomainMutation.data.dnsRecord.name}
            <br />
            Valor: {setDomainMutation.data.dnsRecord.value}
          </code>
        </div>
      )}
    </div>
  );
}
```

### ✅ Checklist de Implementação

- [ ] Adicionar campos de branding ao schema `tenants`
- [ ] Criar migração para white-label
- [ ] Implementar `brandingRouter` com 4 endpoints
- [ ] Criar `BrandingContext` e provider
- [ ] Implementar aplicação dinâmica de cores (CSS variables)
- [ ] Criar página de configuração `/settings/branding`
- [ ] Implementar upload de logo para S3
- [ ] Configurar DNS verification
- [ ] Atualizar emails transacionais com branding
- [ ] Testar com diferentes combinações de cores
- [ ] Validar acesso apenas para Enterprise
- [ ] Documentar processo de configuração

---

## 🔌 Fase 6: Webhooks e API Pública (3-4 semanas)

### 🎯 Objetivo
Permitir integrações externas via webhooks para eventos da plataforma e fornecer API REST pública para acesso programático.

### 🏗️ Arquitetura Técnica

#### Database Schema
```sql
CREATE TABLE webhooks (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(64) NOT NULL,
  events JSON NOT NULL, -- ['assessment.created', 'proposal.sent']
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE webhook_deliveries (
  id VARCHAR(36) PRIMARY KEY,
  webhook_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  response_status INT,
  response_body TEXT,
  delivered_at TIMESTAMP,
  attempts INT DEFAULT 0,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_webhook (webhook_id),
  INDEX idx_next_retry (next_retry_at),
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

CREATE TABLE api_keys (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  key_prefix VARCHAR(16) NOT NULL, -- Para exibir "pk_live_****"
  scopes JSON NOT NULL, -- ['assessments:read', 'proposals:write']
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_key_hash (key_hash),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

#### Webhook System (`server/_core/webhooks.ts`)
```typescript
import crypto from 'crypto';
import { getDb } from './db';
import axios from 'axios';

export type WebhookEvent =
  | 'assessment.created'
  | 'assessment.completed'
  | 'proposal.created'
  | 'proposal.sent'
  | 'proposal.accepted'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'invoice.paid';

export async function triggerWebhook(
  tenantId: string,
  event: WebhookEvent,
  payload: any
) {
  const db = await getDb();
  if (!db) return;

  // Buscar webhooks ativos para este evento
  const webhooks = await db.query.webhooks.findMany({
    where: (webhooks, { eq, and }) =>
      and(
        eq(webhooks.tenantId, tenantId),
        eq(webhooks.active, true)
      ),
  });

  const relevantWebhooks = webhooks.filter((wh) =>
    JSON.parse(wh.events as string).includes(event)
  );

  // Enviar para cada webhook
  for (const webhook of relevantWebhooks) {
    const deliveryId = nanoid();

    await db.insert(webhookDeliveries).values({
      id: deliveryId,
      webhookId: webhook.id,
      eventType: event,
      payload: JSON.stringify(payload),
      attempts: 0,
    });

    // Enviar de forma assíncrona (não bloquear request principal)
    deliverWebhook(deliveryId, webhook, event, payload).catch(console.error);
  }
}

async function deliverWebhook(
  deliveryId: string,
  webhook: any,
  event: string,
  payload: any
) {
  const db = await getDb();
  if (!db) return;

  const timestamp = Date.now();
  const signature = generateSignature(webhook.secret, timestamp, payload);

  try {
    const response = await axios.post(
      webhook.url,
      {
        event,
        timestamp,
        data: payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Blackbelt-Event': event,
          'X-Blackbelt-Signature': signature,
          'X-Blackbelt-Delivery': deliveryId,
        },
        timeout: 10000, // 10 segundos
      }
    );

    await db.update(webhookDeliveries)
      .set({
        responseStatus: response.status,
        responseBody: JSON.stringify(response.data),
        deliveredAt: new Date(),
        attempts: 1,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  } catch (error: any) {
    await db.update(webhookDeliveries)
      .set({
        responseStatus: error.response?.status || 0,
        responseBody: error.message,
        attempts: 1,
        nextRetryAt: new Date(Date.now() + 60000), // Retry em 1 min
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    // Agendar retry (implementar fila com Bull/BullMQ)
  }
}

function generateSignature(secret: string, timestamp: number, payload: any): string {
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
}

export function verifyWebhookSignature(
  secret: string,
  timestamp: number,
  payload: any,
  signature: string
): boolean {
  const expectedSignature = generateSignature(secret, timestamp, payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

#### tRPC Router (`server/routers/webhooks.ts`)
```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../_core/db';
import { requireFeature } from '../_core/subscriptionMiddleware';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

const eventEnum = z.enum([
  'assessment.created',
  'assessment.completed',
  'proposal.created',
  'proposal.sent',
  'proposal.accepted',
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'invoice.paid',
]);

export const webhooksRouter = router({
  /**
   * Listar webhooks
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      await requireFeature(ctx.tenantId, 'webhooks');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const webhooks = await db.query.webhooks.findMany({
        where: (webhooks, { eq }) => eq(webhooks.tenantId, ctx.tenantId),
        orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)],
      });

      return webhooks;
    }),

  /**
   * Criar webhook
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      url: z.string().url(),
      events: z.array(eventEnum).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFeature(ctx.tenantId, 'webhooks');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const secret = crypto.randomBytes(32).toString('hex');

      const webhook = await db.insert(webhooks).values({
        id: nanoid(),
        tenantId: ctx.tenantId,
        name: input.name,
        url: input.url,
        secret,
        events: JSON.stringify(input.events),
        active: true,
      });

      return {
        id: webhook.insertId,
        secret, // Retornar secret apenas uma vez
      };
    }),

  /**
   * Atualizar webhook
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      url: z.string().url().optional(),
      events: z.array(eventEnum).min(1).optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFeature(ctx.tenantId, 'webhooks');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const { id, ...updates } = input;

      await db.update(webhooks)
        .set({
          ...updates,
          events: updates.events ? JSON.stringify(updates.events) : undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(webhooks.id, id),
          eq(webhooks.tenantId, ctx.tenantId)
        ));

      return { success: true };
    }),

  /**
   * Deletar webhook
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireFeature(ctx.tenantId, 'webhooks');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await db.delete(webhooks)
        .where(and(
          eq(webhooks.id, input.id),
          eq(webhooks.tenantId, ctx.tenantId)
        ));

      return { success: true };
    }),

  /**
   * Listar deliveries de um webhook
   */
  listDeliveries: protectedProcedure
    .input(z.object({
      webhookId: z.string(),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      await requireFeature(ctx.tenantId, 'webhooks');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Verificar se webhook pertence ao tenant
      const webhook = await db.query.webhooks.findFirst({
        where: (webhooks, { eq, and }) =>
          and(
            eq(webhooks.id, input.webhookId),
            eq(webhooks.tenantId, ctx.tenantId)
          ),
      });

      if (!webhook) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const deliveries = await db.query.webhookDeliveries.findMany({
        where: (deliveries, { eq }) => eq(deliveries.webhookId, input.webhookId),
        limit: input.perPage,
        offset: (input.page - 1) * input.perPage,
        orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
      });

      return deliveries;
    }),

  /**
   * Retentar delivery
   */
  retryDelivery: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireFeature(ctx.tenantId, 'webhooks');

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Buscar delivery e webhook
      const delivery = await db.query.webhookDeliveries.findFirst({
        where: (deliveries, { eq }) => eq(deliveries.id, input.deliveryId),
        with: {
          webhook: true,
        },
      });

      if (!delivery || delivery.webhook.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Reenviar
      const { deliverWebhook } = await import('../_core/webhooks');
      await deliverWebhook(
        input.deliveryId,
        delivery.webhook,
        delivery.eventType,
        JSON.parse(delivery.payload)
      );

      return { success: true };
    }),
});
```

#### REST API (`server/_core/restApi.ts`)
```typescript
import express from 'express';
import { getDb } from './db';
import crypto from 'crypto';

const router = express.Router();

// Middleware de autenticação por API key
async function authenticateAPIKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: 'Database unavailable' });
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const apiKeyRecord = await db.query.apiKeys.findFirst({
    where: (keys, { eq, and }) =>
      and(
        eq(keys.keyHash, keyHash),
        eq(keys.expiresAt, null) // ou expiresAt > now()
      ),
    with: {
      tenant: true,
    },
  });

  if (!apiKeyRecord) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Atualizar last_used_at
  await db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyRecord.id));

  // Adicionar info ao request
  req.tenantId = apiKeyRecord.tenantId;
  req.apiKeyScopes = JSON.parse(apiKeyRecord.scopes as string);

  next();
}

// Rate limiting por tenant
// (usar express-rate-limit com store baseado em tenantId)

// GET /api/v1/assessments
router.get('/assessments', authenticateAPIKey, async (req, res) => {
  const db = await getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  const assessments = await db.query.assessments.findMany({
    where: (assessments, { eq }) => eq(assessments.tenantId, req.tenantId),
    limit: 100,
  });

  res.json({ data: assessments });
});

// POST /api/v1/assessments
router.post('/assessments', authenticateAPIKey, async (req, res) => {
  // Verificar scope
  if (!req.apiKeyScopes.includes('assessments:write')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const db = await getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  // Validar e criar assessment
  // ...

  res.status(201).json({ data: {} });
});

// GET /api/v1/proposals
router.get('/proposals', authenticateAPIKey, async (req, res) => {
  const db = await getDb();
  if (!db) return res.status(500).json({ error: 'Database unavailable' });

  const proposals = await db.query.proposals.findMany({
    where: (proposals, { eq }) => eq(proposals.tenantId, req.tenantId),
    limit: 100,
  });

  res.json({ data: proposals });
});

export default router;
```

### ✅ Checklist de Implementação

- [ ] Criar schemas para `webhooks`, `webhook_deliveries`, `api_keys`
- [ ] Implementar sistema de webhooks com retries
- [ ] Criar `webhooksRouter` com 6 endpoints
- [ ] Implementar geração e verificação de assinaturas
- [ ] Criar página de configuração de webhooks
- [ ] Implementar REST API pública
- [ ] Criar sistema de API keys
- [ ] Implementar autenticação e scopes
- [ ] Adicionar rate limiting por tenant
- [ ] Documentar API com Swagger/OpenAPI
- [ ] Criar página de gerenciamento de API keys
- [ ] Testar deliveries e retries
- [ ] Adicionar logs e monitoring

---

## 🔐 Fase 7: Segurança Adicional (2-3 semanas)

### 🎯 Objetivo
Implementar camadas adicionais de segurança incluindo 2FA/MFA, IP whitelisting, audit logs avançados e gerenciamento de sessões.

### 🏗️ Implementação Resumida

#### 2FA/MFA com TOTP
```typescript
// Usar biblioteca: otplib
pnpm add otplib qrcode

// Endpoints:
- enable2FA: Gerar secret, retornar QR code
- verify2FA: Validar código e ativar
- disable2FA: Desativar com senha
- verifyLogin: Validar código no login
```

#### IP Whitelisting (Enterprise)
```sql
CREATE TABLE ip_whitelist (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  ip_address VARCHAR(45) NOT NULL, -- IPv4 ou IPv6
  description VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Audit Logs Avançados
```sql
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36),
  changes JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_created (tenant_id, created_at),
  INDEX idx_user (user_id),
  INDEX idx_resource (resource_type, resource_id)
);
```

### ✅ Checklist de Implementação

- [ ] Instalar otplib e qrcode
- [ ] Criar tabela `user_2fa` para secrets
- [ ] Implementar endpoints de 2FA
- [ ] Adicionar middleware de verificação 2FA
- [ ] Criar UI para ativar/desativar 2FA
- [ ] Implementar IP whitelisting
- [ ] Criar audit logs avançados
- [ ] Implementar session management
- [ ] Adicionar alertas de segurança
- [ ] Documentar features de segurança

---

## 📊 Fase 8: Analytics Avançado (2-3 semanas)

### 🎯 Objetivo
Fornecer dashboards analíticos para administradores e clientes visualizarem métricas de negócio e uso.

### 🏗️ Implementação Resumida

#### Métricas para Administradores
- MRR (Monthly Recurring Revenue)
- Churn rate (taxa de cancelamento)
- Conversion rate (trial → paid)
- ARPU (Average Revenue Per User)
- LTV (Lifetime Value)
- Planos mais populares
- Crescimento de usuários

#### Métricas para Clientes
- Avaliações completadas por período
- Propostas geradas e taxa de aceitação
- Uso de recursos (usuários, storage, API)
- ROI estimado
- Economia em multas evitadas

#### Stack Técnica
```typescript
// Backend: Agregação de dados
- Queries SQL otimizadas com índices
- Cache com Redis
- Processamento batch diário

// Frontend: Visualização
- Recharts para gráficos
- Tabelas com react-table
- Exportação CSV/Excel
```

### ✅ Checklist de Implementação

- [ ] Criar views SQL para métricas agregadas
- [ ] Implementar cache de métricas
- [ ] Criar endpoints tRPC para analytics
- [ ] Desenvolver dashboard admin
- [ ] Desenvolver dashboard cliente
- [ ] Implementar exportação de relatórios
- [ ] Adicionar filtros por período
- [ ] Otimizar queries com índices
- [ ] Documentar métricas disponíveis

---

## 📱 Fase 9: Mobile App React Native (8-12 semanas)

### 🎯 Objetivo
Criar aplicativo móvel multiplataforma (iOS/Android) para acesso mobile à plataforma.

### 🏗️ Arquitetura Técnica

#### Setup Inicial
```bash
npx react-native init BlackBeltMobile --template react-native-template-typescript
cd BlackBeltMobile
pnpm add @trpc/client @trpc/react-query @tanstack/react-query
pnpm add @react-navigation/native @react-navigation/stack
pnpm add react-native-mmkv # Para storage offline
pnpm add react-native-push-notification # Para notificações
```

#### Features Prioritárias

**MVP (4 semanas):**
- Login e autenticação
- Dashboard com métricas
- Lista de avaliações
- Visualizar detalhes de avaliação
- Lista de propostas
- Notificações push

**Fase 2 (4 semanas):**
- Criar nova avaliação (formulário)
- Anexar fotos às avaliações
- Modo offline com sincronização
- Filtros e busca

**Fase 3 (4 semanas):**
- Aprovar/rejeitar propostas
- Chat/mensagens
- Exportar relatórios
- Configurações de perfil

#### Estrutura do Projeto
```
BlackBeltMobile/
├── src/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── Dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── Assessments/
│   │   │   ├── AssessmentListScreen.tsx
│   │   │   ├── AssessmentDetailScreen.tsx
│   │   │   └── CreateAssessmentScreen.tsx
│   │   └── Proposals/
│   │       ├── ProposalListScreen.tsx
│   │       └── ProposalDetailScreen.tsx
│   ├── components/
│   ├── lib/
│   │   ├── trpc.ts
│   │   ├── storage.ts
│   │   └── notifications.ts
│   └── App.tsx
└── package.json
```

### ✅ Checklist de Implementação

- [ ] Configurar projeto React Native
- [ ] Implementar autenticação
- [ ] Criar navegação entre telas
- [ ] Desenvolver telas MVP
- [ ] Integrar com API tRPC
- [ ] Implementar storage offline
- [ ] Configurar push notifications
- [ ] Testar em iOS e Android
- [ ] Publicar na App Store
- [ ] Publicar no Google Play
- [ ] Documentar processo de build

---

## 🎓 Fase 10: Onboarding Automatizado (2-3 semanas)

### 🎯 Objetivo
Criar experiência de onboarding guiada para novos usuários, aumentando adoção e reduzindo churn inicial.

### 🏗️ Implementação Resumida

#### Wizard de Configuração Inicial
```typescript
// 5 passos:
1. Bem-vindo (vídeo de 2min)
2. Criar primeira empresa/tenant
3. Convidar equipe (3-5 usuários)
4. Configurar primeiro setor
5. Criar primeira avaliação (tour guiado)
```

#### Templates por Setor
```typescript
const templates = {
  varejo: {
    sectors: ['Vendas', 'Estoque', 'Administrativo'],
    commonRisks: ['Queda em altura', 'Ergonomia', 'Incêndio'],
  },
  saude: {
    sectors: ['Enfermaria', 'Laboratório', 'Administrativo'],
    commonRisks: ['Biológico', 'Químico', 'Ergonomia'],
  },
  industria: {
    sectors: ['Produção', 'Manutenção', 'Expedição'],
    commonRisks: ['Máquinas', 'Ruído', 'Químico'],
  },
};
```

#### Tooltips Contextuais
```typescript
// Usar biblioteca: react-joyride
pnpm add react-joyride

// Tours disponíveis:
- Tour do dashboard
- Tour de criação de avaliação
- Tour de geração de proposta
- Tour de configurações
```

### ✅ Checklist de Implementação

- [ ] Criar wizard multi-step
- [ ] Implementar templates por setor
- [ ] Adicionar tours com react-joyride
- [ ] Criar vídeos tutoriais
- [ ] Implementar checklist de progresso
- [ ] Adicionar tooltips contextuais
- [ ] Criar página de ajuda/FAQ
- [ ] Implementar chat de suporte (Intercom)
- [ ] Testar fluxo completo
- [ ] Medir taxa de conclusão

---

## 📋 Resumo de Priorização

### Fases Críticas (Implementar Primeiro)
1. ✅ Fase 1: Licensing & Subscription (Completa)
2. ✅ Fase 2: Payment Gateways (Completa)
3. ✅ Fase 3: Subscription UI (Completa)
4. 🟡 **Fase 4: PDF Export** (2 semanas) - Alto valor comercial
5. 🟡 **Fase 10: Onboarding** (2-3 semanas) - Reduz churn

### Fases de Médio Prazo
6. 🟡 **Fase 5: White-Label** (2-3 semanas) - Diferencial Enterprise
7. 🟡 **Fase 6: Webhooks & API** (3-4 semanas) - Integrações

### Fases de Longo Prazo
8. 🟢 **Fase 7: Segurança** (2-3 semanas) - Compliance
9. 🟢 **Fase 8: Analytics** (2-3 semanas) - Insights
10. 🟢 **Fase 9: Mobile App** (8-12 semanas) - Expansão

---

## 🎯 Timeline Sugerido (6 meses)

### Mês 1-2: Consolidação Pós-Launch
- ✅ Fases 1-3 já completas
- Monitorar métricas de uso
- Coletar feedback de primeiros clientes
- Bugs críticos e ajustes

### Mês 3: Features de Alto Valor
- **Semana 1-2**: Fase 4 (PDF Export)
- **Semana 3-4**: Fase 10 (Onboarding)

### Mês 4: Enterprise Features
- **Semana 1-3**: Fase 5 (White-Label)
- **Semana 4**: Planejamento Fase 6

### Mês 5: Integrações
- **Semana 1-4**: Fase 6 (Webhooks & API)

### Mês 6: Segurança e Analytics
- **Semana 1-2**: Fase 7 (Segurança)
- **Semana 3-4**: Fase 8 (Analytics)

### Mês 7+: Mobile
- **12 semanas**: Fase 9 (Mobile App)

---

## 📞 Suporte e Recursos

### Documentação Técnica
- [Stripe Billing Docs](https://stripe.com/docs/billing)
- [Mercado Pago Docs](https://www.mercadopago.com.br/developers)
- [tRPC Docs](https://trpc.io)
- [React Native Docs](https://reactnative.dev)
- [PDFKit Docs](https://pdfkit.org)

### Ferramentas Recomendadas
- **Monitoring**: Sentry, DataDog
- **Analytics**: Mixpanel, Amplitude
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel, AWS, Railway

### Contato
- **Email**: dev@blackbelt-consultoria.com
- **GitHub**: https://github.com/CarlosHonorato70/blackbelt-platform
- **Discord**: [Link da comunidade]

---

**Última atualização:** Dezembro 2024  
**Status:** Roadmap Ativo - Fases 1-3 Completas ✅
