/**
 * PDF Access Guard
 *
 * Garante que empresas (tenants do tipo "company") só podem acessar PDFs
 * após a proposta final ser aprovada E a 1ª parcela (40%) ser paga.
 *
 * Consultores (tenant pai) sempre têm acesso irrestrito.
 */

import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { tenants, proposals, proposalPayments } from "../../drizzle/schema";

/**
 * Verifica se o tenant tem permissão para acessar/gerar PDFs NR-01.
 *
 * Regras:
 * - Consultores (tenantType !== "company") → acesso liberado
 * - Empresas (tenantType === "company") → precisa de:
 *   1. Proposta final com status "approved"
 *   2. 1ª parcela (installment = 1) com status "paid"
 *
 * @throws TRPCError FORBIDDEN se a empresa não atender os requisitos
 */
export async function requirePdfAccess(tenantId: string, db: any): Promise<void> {
  // Buscar o tenant para verificar se é empresa
  const [tenant] = await db.select({
    tenantType: tenants.tenantType,
    parentTenantId: tenants.parentTenantId,
  }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

  // Se não encontrou o tenant ou não é empresa, libera acesso
  if (!tenant || tenant.tenantType !== "company") {
    return; // Consultor — acesso irrestrito
  }

  // É empresa — verificar proposta final aprovada
  const [finalProposal] = await db.select({
    id: proposals.id,
    status: proposals.status,
    paymentStatus: proposals.paymentStatus,
  }).from(proposals).where(
    and(
      eq(proposals.clientId, tenantId),
      sql`${proposals.proposalType} = 'final'`,
      sql`${proposals.status} = 'approved'`
    )
  ).orderBy(desc(proposals.createdAt)).limit(1);

  if (!finalProposal) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Os documentos NR-01 serão liberados após a aprovação da proposta final. Entre em contato com sua consultoria.",
    });
  }

  // Se paymentStatus já é "paid", libera (todas as parcelas pagas)
  if (finalProposal.paymentStatus === "paid") {
    return;
  }

  // Verificar se a 1ª parcela (40%) foi paga
  const [firstInstallment] = await db.select({
    status: proposalPayments.status,
    percentage: proposalPayments.percentage,
  }).from(proposalPayments).where(
    and(
      eq(proposalPayments.proposalId, finalProposal.id),
      eq(proposalPayments.installment, 1)
    )
  ).limit(1);

  if (!firstInstallment || firstInstallment.status !== "paid") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Os documentos NR-01 serão liberados após o pagamento da 1ª parcela (40%). Acesse a seção de pagamentos para efetuar o pagamento.",
    });
  }

  // 1ª parcela paga — acesso liberado
}
