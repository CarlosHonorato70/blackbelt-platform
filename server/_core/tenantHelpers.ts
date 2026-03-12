/**
 * TENANT HELPERS
 *
 * Funções auxiliares para auto-criação de tenants.
 * Garante que usuários sem tenant possam completar o checkout.
 */

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { log } from "./logger";
import { getDb } from "../db";
import * as db from "../db";
import { tenants, roles, userRoles, users } from "../../drizzle/schema";

/**
 * Garante que um usuário tenha um tenant associado.
 * Se não tiver, cria um automaticamente e atribui role "manager".
 *
 * @returns tenantId (existente ou recém-criado), ou null se falhar
 */
export async function ensureTenantForUser(
  userId: string,
  userName: string,
  userEmail: string,
  existingTenantId?: string | null
): Promise<string | null> {
  // Se já tem tenant, retorna direto
  if (existingTenantId) return existingTenantId;

  const drizzleDb = await getDb();
  if (!drizzleDb) return null;

  try {
    // Buscar user atual para pegar tenantId atualizado (pode ter mudado)
    const currentUser = await db.getUserByEmail(userEmail);
    if (currentUser?.tenantId) return currentUser.tenantId;

    // Criar tenant
    const tenantId = nanoid();
    const tempCnpj = `00.000.000/${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;

    await drizzleDb.insert(tenants).values({
      id: tenantId,
      name: userName,
      cnpj: tempCnpj,
      contactName: userName,
      contactEmail: userEmail,
      status: "active",
      strategy: "shared_rls",
    });

    // Atualizar usuário com tenantId
    await drizzleDb
      .update(users)
      .set({ tenantId })
      .where(eq(users.id, userId));

    // Atribuir role manager
    try {
      const managerRole = await drizzleDb
        .select()
        .from(roles)
        .where(eq(roles.systemName, "manager"))
        .limit(1);

      if (managerRole.length > 0) {
        await drizzleDb.insert(userRoles).values({
          id: nanoid(),
          userId,
          roleId: managerRole[0].id,
          tenantId,
        });
      }
    } catch (err) {
      log.warn("ensureTenantForUser: failed to assign manager role", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    log.info("ensureTenantForUser: auto-created tenant", { tenantId, userId, email: userEmail });
    return tenantId;
  } catch (err) {
    log.error("ensureTenantForUser: failed to create tenant", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
