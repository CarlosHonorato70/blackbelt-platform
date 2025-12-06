import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import * as dns from "dns/promises";

/**
 * Phase 5: White-Label / Branding Router
 * 
 * Provides Enterprise customers with ability to customize:
 * - Logo and favicon
 * - Primary and secondary colors
 * - Custom domain with DNS verification
 * - Email sender customization
 */

export const brandingRouter = router({
  /**
   * Get current branding configuration
   */
  getBranding: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, ctx.tenantId),
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

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
    }

    return tenant;
  }),

  /**
   * Update branding configuration (requires Enterprise plan)
   */
  updateBranding: protectedProcedure
    .input(
      z.object({
        logoUrl: z.string().url().optional(),
        faviconUrl: z.string().url().optional(),
        primaryColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (#RRGGBB)")
          .optional(),
        secondaryColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (#RRGGBB)")
          .optional(),
        emailSenderName: z.string().max(255).optional(),
        emailSenderEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Check if tenant has Enterprise plan with white-label feature
      // This should be checked via subscription plan features
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, ctx.tenantId),
        with: {
          subscription: {
            with: {
              plan: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      // Check if plan supports white-label
      const hasWhiteLabelFeature = tenant.subscription?.plan?.features?.includes(
        "white_label"
      );

      if (!hasWhiteLabelFeature) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "White-label customization requires an Enterprise plan. Please upgrade your subscription.",
        });
      }

      // Update branding
      await db
        .update(tenants)
        .set({
          ...input,
          whiteLabelEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, ctx.tenantId));

      return { success: true };
    }),

  /**
   * Configure custom domain
   */
  setCustomDomain: protectedProcedure
    .input(
      z.object({
        domain: z
          .string()
          .regex(
            /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i,
            "Invalid domain format"
          ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Check if tenant has Enterprise plan
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, ctx.tenantId),
        with: {
          subscription: {
            with: {
              plan: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      const hasWhiteLabelFeature = tenant.subscription?.plan?.features?.includes(
        "white_label"
      );

      if (!hasWhiteLabelFeature) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Custom domain requires an Enterprise plan. Please upgrade.",
        });
      }

      // Check if domain is already in use by another tenant
      const existingDomain = await db.query.tenants.findFirst({
        where: eq(tenants.customDomain, input.domain),
      });

      if (existingDomain && existingDomain.id !== ctx.tenantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This domain is already in use by another account.",
        });
      }

      // Save domain (unverified)
      await db
        .update(tenants)
        .set({
          customDomain: input.domain,
          customDomainVerified: false,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, ctx.tenantId));

      // Generate DNS verification record
      const dnsRecord = {
        type: "CNAME",
        name: input.domain,
        value: process.env.APP_DOMAIN || "app.blackbelt-platform.com",
        ttl: 3600,
      };

      return {
        success: true,
        dnsRecord,
        message:
          "Configure the DNS record and click 'Verify' to complete setup.",
      };
    }),

  /**
   * Verify custom domain DNS configuration
   */
  verifyCustomDomain: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, ctx.tenantId),
      columns: { customDomain: true },
    });

    if (!tenant?.customDomain) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No custom domain configured",
      });
    }

    // Verify DNS CNAME record
    try {
      const isVerified = await verifyDNS(
        tenant.customDomain,
        process.env.APP_DOMAIN || "app.blackbelt-platform.com"
      );

      if (isVerified) {
        await db
          .update(tenants)
          .set({
            customDomainVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, ctx.tenantId));

        return {
          success: true,
          verified: true,
          message: "Domain verified successfully!",
        };
      } else {
        return {
          success: false,
          verified: false,
          message:
            "DNS record not found or incorrect. Please check your DNS configuration and try again in a few minutes.",
        };
      }
    } catch (error) {
      console.error("DNS verification error:", error);
      return {
        success: false,
        verified: false,
        message: "DNS verification failed. Please check your DNS configuration.",
      };
    }
  }),

  /**
   * Remove custom domain
   */
  removeCustomDomain: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    await db
      .update(tenants)
      .set({
        customDomain: null,
        customDomainVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, ctx.tenantId));

    return { success: true };
  }),
});

/**
 * Verify DNS CNAME record
 */
async function verifyDNS(
  domain: string,
  expectedTarget: string
): Promise<boolean> {
  try {
    const records = await dns.resolveCname(domain);
    // Check if any CNAME record points to our app domain
    return records.some((record) => record.includes(expectedTarget));
  } catch (error) {
    console.error("DNS lookup failed:", error);
    return false;
  }
}
