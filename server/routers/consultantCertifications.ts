/**
 * Router: Consultant Certifications
 * Permite que consultorias façam upload e gerenciem suas certificações profissionais
 * (CRP, CREA, CRM, ISO, NR, etc.)
 */

import { z } from "zod";
import { router, tenantProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { consultantCertifications } from "../../drizzle/schema";
import { storageGet } from "../storage";

export const consultantCertificationsRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(consultantCertifications)
      .where(eq(consultantCertifications.tenantId, ctx.tenantId))
      .orderBy(desc(consultantCertifications.createdAt));
    return rows;
  }),

  getDownloadUrl: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [cert] = await db
        .select()
        .from(consultantCertifications)
        .where(
          and(
            eq(consultantCertifications.id, input.id),
            eq(consultantCertifications.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!cert) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Certificação não encontrada" });
      }

      const { url } = await storageGet(cert.fileKey, 3600);
      return { url };
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        registryNumber: z.string().optional(),
        certType: z.string().optional(),
        issuer: z.string().optional(),
        issuedAt: z.string().nullable().optional(),
        expiresAt: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { id, ...data } = input;

      const [cert] = await db
        .select()
        .from(consultantCertifications)
        .where(
          and(
            eq(consultantCertifications.id, id),
            eq(consultantCertifications.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!cert) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Certificação não encontrada" });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.registryNumber !== undefined) updateData.registryNumber = data.registryNumber;
      if (data.certType !== undefined) updateData.certType = data.certType;
      if (data.issuer !== undefined) updateData.issuer = data.issuer;
      if (data.issuedAt !== undefined) updateData.issuedAt = data.issuedAt ? new Date(data.issuedAt) : null;
      if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await db
        .update(consultantCertifications)
        .set(updateData)
        .where(eq(consultantCertifications.id, id));

      return { success: true };
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [cert] = await db
        .select()
        .from(consultantCertifications)
        .where(
          and(
            eq(consultantCertifications.id, input.id),
            eq(consultantCertifications.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!cert) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Certificação não encontrada" });
      }

      await db
        .delete(consultantCertifications)
        .where(eq(consultantCertifications.id, input.id));

      return { success: true };
    }),
});
