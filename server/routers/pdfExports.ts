/**
 * PDF Export tRPC Router
 * Handles PDF generation, storage, and delivery
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { pdfExports } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  generateProposalPdf,
  generateAssessmentPdf,
  type ProposalPdfData,
  type AssessmentPdfData,
  type PdfBranding,
} from "../_core/pdfGenerator";
import { uploadPdfToS3, isS3Configured, getPresignedDownloadUrl } from "../_core/s3Upload";
import {
  sendProposalEmail,
  sendAssessmentEmail,
  isEmailConfigured,
} from "../_core/emailService";

// Validation schemas
const pdfBrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  companyName: z.string().optional(),
});

const proposalPdfDataSchema = z.object({
  proposalNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().email().optional(),
  date: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })
  ),
  subtotal: z.number(),
  discount: z.number().optional(),
  tax: z.number().optional(),
  total: z.number(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
});

const assessmentPdfDataSchema = z.object({
  assessmentNumber: z.string(),
  companyName: z.string(),
  date: z.string(),
  sector: z.string(),
  riskLevel: z.string(),
  findings: z.array(
    z.object({
      hazard: z.string(),
      risk: z.string(),
      severity: z.string(),
      probability: z.string(),
      recommendations: z.string(),
    })
  ),
  summary: z.string(),
  inspector: z.string(),
});

export const pdfExportsRouter = router({
  /**
   * Check if PDF export service is available
   */
  isAvailable: protectedProcedure.query(async () => {
    return {
      pdfGeneration: true, // Always available
      s3Storage: isS3Configured(),
      emailDelivery: isEmailConfigured(),
    };
  }),

  /**
   * Generate and optionally send a proposal PDF
   */
  generateProposal: protectedProcedure
    .input(
      z.object({
        proposalId: z.string(),
        data: proposalPdfDataSchema,
        branding: pdfBrandingSchema.optional(),
        sendEmail: z.boolean().default(false),
        emailTo: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.tenantId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Tenant ID required" });

      const exportId = nanoid();
      const filename = `proposta-${input.data.proposalNumber}.pdf`;

      try {
        // Generate PDF
        const pdfBuffer = await generateProposalPdf(
          input.data,
          input.branding,
          { title: `Proposta ${input.data.proposalNumber}` }
        );

        let s3Key: string | undefined;
        let s3Bucket: string | undefined;
        let url: string | undefined;

        // Upload to S3 if configured
        if (isS3Configured()) {
          const uploadResult = await uploadPdfToS3(
            pdfBuffer,
            filename,
            ctx.tenantId,
            {
              documentType: "proposal",
              proposalId: input.proposalId,
              proposalNumber: input.data.proposalNumber,
            }
          );

          s3Key = uploadResult.key;
          s3Bucket = uploadResult.bucket;
          url = uploadResult.url;
        }

        // Send email if requested
        let emailSent = false;
        let emailSentAt: Date | undefined;

        if (input.sendEmail && input.emailTo) {
          if (!isEmailConfigured()) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Email service not configured",
            });
          }

          await sendProposalEmail(
            input.emailTo,
            input.data.proposalNumber,
            input.data.clientName,
            pdfBuffer,
            input.branding?.companyName
          );

          emailSent = true;
          emailSentAt = new Date();
        }

        // Save export record
        await db.insert(pdfExports).values({
          id: exportId,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          documentType: "proposal",
          documentId: input.proposalId,
          filename,
          fileSize: pdfBuffer.length,
          mimeType: "application/pdf",
          s3Key,
          s3Bucket,
          url,
          status: "completed",
          brandingApplied: !!input.branding,
          customLogo: input.branding?.logoUrl,
          customColors: input.branding
            ? {
                primary: input.branding.primaryColor,
                secondary: input.branding.secondaryColor,
              }
            : null,
          emailSent,
          emailTo: input.emailTo,
          emailSentAt,
          expiresAt: url ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // 24 hours
          downloadCount: 0,
        });

        return {
          id: exportId,
          filename,
          url,
          size: pdfBuffer.length,
          emailSent,
          // Return buffer as base64 if S3 is not configured
          pdfBase64: !isS3Configured() ? pdfBuffer.toString("base64") : undefined,
        };
      } catch (error) {
        // Save failed export record
        await db.insert(pdfExports).values({
          id: exportId,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          documentType: "proposal",
          documentId: input.proposalId,
          filename,
          fileSize: 0,
          mimeType: "application/pdf",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          brandingApplied: false,
          downloadCount: 0,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Generate and optionally send an assessment PDF
   */
  generateAssessment: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        data: assessmentPdfDataSchema,
        branding: pdfBrandingSchema.optional(),
        sendEmail: z.boolean().default(false),
        emailTo: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.tenantId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Tenant ID required" });

      const exportId = nanoid();
      const filename = `avaliacao-${input.data.assessmentNumber}.pdf`;

      try {
        // Generate PDF
        const pdfBuffer = await generateAssessmentPdf(
          input.data,
          input.branding,
          { title: `Avaliação ${input.data.assessmentNumber}` }
        );

        let s3Key: string | undefined;
        let s3Bucket: string | undefined;
        let url: string | undefined;

        // Upload to S3 if configured
        if (isS3Configured()) {
          const uploadResult = await uploadPdfToS3(
            pdfBuffer,
            filename,
            ctx.tenantId,
            {
              documentType: "assessment",
              assessmentId: input.assessmentId,
              assessmentNumber: input.data.assessmentNumber,
            }
          );

          s3Key = uploadResult.key;
          s3Bucket = uploadResult.bucket;
          url = uploadResult.url;
        }

        // Send email if requested
        let emailSent = false;
        let emailSentAt: Date | undefined;

        if (input.sendEmail && input.emailTo) {
          if (!isEmailConfigured()) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Email service not configured",
            });
          }

          await sendAssessmentEmail(
            input.emailTo,
            input.data.assessmentNumber,
            input.data.companyName,
            pdfBuffer,
            input.branding?.companyName
          );

          emailSent = true;
          emailSentAt = new Date();
        }

        // Save export record
        await db.insert(pdfExports).values({
          id: exportId,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          documentType: "assessment",
          documentId: input.assessmentId,
          filename,
          fileSize: pdfBuffer.length,
          mimeType: "application/pdf",
          s3Key,
          s3Bucket,
          url,
          status: "completed",
          brandingApplied: !!input.branding,
          customLogo: input.branding?.logoUrl,
          customColors: input.branding
            ? {
                primary: input.branding.primaryColor,
                secondary: input.branding.secondaryColor,
              }
            : null,
          emailSent,
          emailTo: input.emailTo,
          emailSentAt,
          expiresAt: url ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // 24 hours
          downloadCount: 0,
        });

        return {
          id: exportId,
          filename,
          url,
          size: pdfBuffer.length,
          emailSent,
          // Return buffer as base64 if S3 is not configured
          pdfBase64: !isS3Configured() ? pdfBuffer.toString("base64") : undefined,
        };
      } catch (error) {
        // Save failed export record
        await db.insert(pdfExports).values({
          id: exportId,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          documentType: "assessment",
          documentId: input.assessmentId,
          filename,
          fileSize: 0,
          mimeType: "application/pdf",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          brandingApplied: false,
          downloadCount: 0,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List PDF exports for current tenant
   */
  listExports: protectedProcedure
    .input(
      z.object({
        documentType: z.enum(["proposal", "assessment", "report", "invoice", "contract"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.tenantId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Tenant ID required" });

      const conditions = [eq(pdfExports.tenantId, ctx.tenantId)];

      if (input.documentType) {
        conditions.push(eq(pdfExports.documentType, input.documentType));
      }

      const exports = await db
        .select()
        .from(pdfExports)
        .where(and(...conditions))
        .orderBy(desc(pdfExports.createdAt))
        .limit(input.limit);

      return exports;
    }),

  /**
   * Get a specific PDF export
   */
  getExport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.tenantId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Tenant ID required" });

      const [pdfExport] = await db
        .select()
        .from(pdfExports)
        .where(and(eq(pdfExports.id, input.id), eq(pdfExports.tenantId, ctx.tenantId)))
        .limit(1);

      if (!pdfExport) {
        throw new TRPCError({ code: "NOT_FOUND", message: "PDF export not found" });
      }

      // Regenerate presigned URL if expired and S3 is configured
      if (pdfExport.s3Key && pdfExport.expiresAt && new Date() > pdfExport.expiresAt) {
        const newUrl = await getPresignedDownloadUrl(pdfExport.s3Key, 86400);
        await db
          .update(pdfExports)
          .set({
            url: newUrl,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          })
          .where(eq(pdfExports.id, input.id));

        pdfExport.url = newUrl;
      }

      return pdfExport;
    }),

  /**
   * Track download of a PDF export
   */
  trackDownload: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      if (!ctx.tenantId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Tenant ID required" });

      const [pdfExport] = await db
        .select()
        .from(pdfExports)
        .where(and(eq(pdfExports.id, input.id), eq(pdfExports.tenantId, ctx.tenantId)))
        .limit(1);

      if (!pdfExport) {
        throw new TRPCError({ code: "NOT_FOUND", message: "PDF export not found" });
      }

      await db
        .update(pdfExports)
        .set({
          downloadCount: (pdfExport.downloadCount || 0) + 1,
          lastDownloadedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pdfExports.id, input.id));

      return { success: true };
    }),
});
