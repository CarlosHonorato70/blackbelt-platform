import { mysqlTable, mysqlEnum, text, timestamp, varchar, int, boolean, json, index } from "drizzle-orm/mysql-core";

/**
 * Schema for the BlackBelt AI Agent system
 */

// Agent conversations
export const agentConversations = mysqlTable("agent_conversations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  companyId: varchar("companyId", { length: 64 }), // optional - if conversation is about a specific company
  title: varchar("title", { length: 255 }).notNull(),
  phase: varchar("phase", { length: 50 }), // current NR-01 phase
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => [
  index("idx_agent_conv_tenant").on(table.tenantId),
  index("idx_agent_conv_user").on(table.userId),
  index("idx_agent_conv_company").on(table.companyId),
]);

// Agent messages
export const agentMessages = mysqlTable("agent_messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  conversationId: varchar("conversationId", { length: 64 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: json("metadata"), // extra data (LLM model, tokens, etc.)
  actionType: varchar("actionType", { length: 100 }), // if this message suggests/executes an action
  actionPayload: json("actionPayload"), // action parameters
  actionStatus: varchar("actionStatus", { length: 20 }), // pending, completed, failed
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => [
  index("idx_agent_msg_conv").on(table.conversationId),
  index("idx_agent_msg_conv_created").on(table.conversationId, table.createdAt),
]);

// Agent executed actions
export const agentActions = mysqlTable("agent_actions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  conversationId: varchar("conversationId", { length: 64 }),
  messageId: varchar("messageId", { length: 64 }),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, running, completed, failed
  input: json("input"),
  output: json("output"),
  error: text("error"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => [
  index("idx_agent_action_tenant").on(table.tenantId),
  index("idx_agent_action_status").on(table.status),
  index("idx_agent_action_conv").on(table.conversationId),
  index("idx_agent_action_tenant_status").on(table.tenantId, table.status, table.createdAt),
]);

// Agent proactive alerts
export const agentAlerts = mysqlTable("agent_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  companyId: varchar("companyId", { length: 64 }),
  alertType: varchar("alertType", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // info, warning, high, critical
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  dismissed: boolean("dismissed").default(false),
  dismissedAt: timestamp("dismissedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => [
  index("idx_agent_alert_tenant").on(table.tenantId),
  index("idx_agent_alert_type").on(table.alertType),
  index("idx_agent_alert_dismissed").on(table.tenantId, table.dismissed, table.createdAt),
]);
