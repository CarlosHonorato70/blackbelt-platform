import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { supportTickets, ticketMessages, tenants, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const supportTicketsRouter = router({
  create: tenantProcedure
    .input(z.object({ title: z.string().min(1).max(255), description: z.string().min(1), priority: z.enum(["low", "medium", "high", "critical"]).default("medium"), category: z.enum(["technical", "billing", "feature_request", "bug", "other"]).default("technical") }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const id = nanoid();
      await database.insert(supportTickets).values({ id, tenantId: ctx.tenantId, userId: ctx.user.id, title: input.title, description: input.description, priority: input.priority, category: input.category, status: "open" });
      return { id, success: true };
    }),

  list: tenantProcedure
    .input(z.object({ status: z.string().optional(), priority: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const conditions = [eq(supportTickets.tenantId, ctx.tenantId)];
      if (input?.status) conditions.push(eq(supportTickets.status, input.status));
      if (input?.priority) conditions.push(eq(supportTickets.priority, input.priority));
      return database.select().from(supportTickets).where(and(...conditions)).orderBy(desc(supportTickets.createdAt));
    }),

  get: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [ticket] = await database.select().from(supportTickets).where(and(eq(supportTickets.id, input.id), eq(supportTickets.tenantId, ctx.tenantId))).limit(1);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket nao encontrado" });
      const messages = await database.select({ message: ticketMessages, userName: users.name }).from(ticketMessages).leftJoin(users, eq(ticketMessages.userId, users.id)).where(and(eq(ticketMessages.ticketId, input.id), eq(ticketMessages.isInternal, false))).orderBy(ticketMessages.createdAt);
      return { ticket, messages };
    }),

  addMessage: tenantProcedure
    .input(z.object({ ticketId: z.string(), message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [ticket] = await database.select().from(supportTickets).where(and(eq(supportTickets.id, input.ticketId), eq(supportTickets.tenantId, ctx.tenantId))).limit(1);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket nao encontrado" });
      const id = nanoid();
      await database.insert(ticketMessages).values({ id, ticketId: input.ticketId, userId: ctx.user.id, message: input.message, isInternal: false });
      await database.update(supportTickets).set({ status: "open", updatedAt: new Date() }).where(eq(supportTickets.id, input.ticketId));
      return { id, success: true };
    }),

  close: tenantProcedure
    .input(z.object({ ticketId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database.update(supportTickets).set({ status: "closed", closedAt: new Date(), updatedAt: new Date() }).where(and(eq(supportTickets.id, input.ticketId), eq(supportTickets.tenantId, ctx.tenantId)));
      return { success: true };
    }),

  adminList: adminProcedure
    .input(z.object({ status: z.string().optional(), priority: z.string().optional(), tenantId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const conditions = [];
      if (input?.status) conditions.push(eq(supportTickets.status, input.status));
      if (input?.priority) conditions.push(eq(supportTickets.priority, input.priority));
      if (input?.tenantId) conditions.push(eq(supportTickets.tenantId, input.tenantId));
      const q = database.select({ ticket: supportTickets, tenantName: tenants.name, userName: users.name }).from(supportTickets).leftJoin(tenants, eq(supportTickets.tenantId, tenants.id)).leftJoin(users, eq(supportTickets.userId, users.id));
      const tickets = conditions.length > 0 ? await q.where(and(...conditions)).orderBy(desc(supportTickets.createdAt)) : await q.orderBy(desc(supportTickets.createdAt));
      return tickets;
    }),

  adminGet: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [ticket] = await database.select({ ticket: supportTickets, tenantName: tenants.name }).from(supportTickets).leftJoin(tenants, eq(supportTickets.tenantId, tenants.id)).where(eq(supportTickets.id, input.id)).limit(1);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket nao encontrado" });
      const messages = await database.select({ message: ticketMessages, userName: users.name }).from(ticketMessages).leftJoin(users, eq(ticketMessages.userId, users.id)).where(eq(ticketMessages.ticketId, input.id)).orderBy(ticketMessages.createdAt);
      return { ...ticket, messages };
    }),

  adminReply: adminProcedure
    .input(z.object({ ticketId: z.string(), message: z.string().min(1), isInternal: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const id = nanoid();
      await database.insert(ticketMessages).values({ id, ticketId: input.ticketId, userId: ctx.user.id, message: input.message, isInternal: input.isInternal });
      if (!input.isInternal) await database.update(supportTickets).set({ status: "waiting_customer", updatedAt: new Date() }).where(eq(supportTickets.id, input.ticketId));
      return { id, success: true };
    }),

  adminUpdateStatus: adminProcedure
    .input(z.object({ ticketId: z.string(), status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]) }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const updateData: Record<string, any> = { status: input.status, updatedAt: new Date() };
      if (input.status === "resolved") updateData.resolvedAt = new Date();
      if (input.status === "closed") updateData.closedAt = new Date();
      await database.update(supportTickets).set(updateData).where(eq(supportTickets.id, input.ticketId));
      return { success: true };
    }),

  adminStats: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const all = await database.select({ status: supportTickets.status, count: sql`COUNT(*)` }).from(supportTickets).groupBy(supportTickets.status);
    const byPriority = await database.select({ priority: supportTickets.priority, count: sql`COUNT(*)` }).from(supportTickets).where(eq(supportTickets.status, "open")).groupBy(supportTickets.priority);
    return { byStatus: all, byPriority };
  }),
});
