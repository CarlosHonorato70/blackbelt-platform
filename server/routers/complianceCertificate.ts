import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  complianceCertificates,
  complianceChecklist,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const complianceCertificateRouter = router({
  // Listar certificados do tenant
  list: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const certificates = await db
        .select()
        .from(complianceCertificates)
        .where(eq(complianceCertificates.tenantId, ctx.tenantId!))
        .orderBy(desc(complianceCertificates.issuedAt));

      return certificates;
    }),

  // Emitir certificado de conformidade
  issue: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        issuedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Calcular score de conformidade
      const items = await db
        .select()
        .from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, ctx.tenantId!));

      if (items.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Nenhum item de checklist encontrado. Execute o seed primeiro.",
        });
      }

      const total = items.length;
      const compliant = items.filter((i) => i.status === "compliant").length;
      const partial = items.filter((i) => i.status === "partial").length;
      const notApplicable = items.filter((i) => i.status === "not_applicable").length;
      const applicable = total - notApplicable;
      const scorePercent =
        applicable > 0
          ? Math.round(((compliant + partial * 0.5) / applicable) * 100)
          : 0;

      if (scorePercent < 80) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Score de conformidade insuficiente: ${scorePercent}%. Mínimo necessário: 80%.`,
        });
      }

      const id = nanoid();
      const year = new Date().getFullYear();
      const certCode = nanoid(6).toUpperCase();
      const certificateNumber = `BB-CERT-${year}-${certCode}`;

      const issuedAt = new Date();
      const validUntil = new Date(issuedAt);
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      const qrCodeData = `https://blackbeltconsultoria.com/verify/${certificateNumber}`;

      await db.insert(complianceCertificates).values({
        id,
        tenantId: ctx.tenantId!,
        certificateNumber,
        issuedAt,
        validUntil,
        status: "active",
        complianceScore: scorePercent,
        issuedBy: input.issuedBy,
        qrCodeData,
        createdAt: new Date(),
      });

      return { id, certificateNumber, complianceScore: scorePercent, validUntil };
    }),

  // Verificar certificado (procedimento público)
  verify: publicProcedure
    .input(z.object({ certificateNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [certificate] = await db
        .select()
        .from(complianceCertificates)
        .where(eq(complianceCertificates.certificateNumber, input.certificateNumber))
        .limit(1);

      if (!certificate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certificado não encontrado",
        });
      }

      const now = new Date();
      const isValid =
        certificate.status === "active" &&
        certificate.validUntil &&
        new Date(certificate.validUntil) > now;

      return {
        certificateNumber: certificate.certificateNumber,
        tenantId: certificate.tenantId,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil,
        status: certificate.status,
        complianceScore: certificate.complianceScore,
        issuedBy: certificate.issuedBy,
        isValid,
      };
    }),

  // Revogar certificado
  revoke: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(complianceCertificates)
        .set({ status: "revoked" })
        .where(and(eq(complianceCertificates.id, input.id), eq(complianceCertificates.tenantId, ctx.tenantId!)));

      return { success: true };
    }),
});
