import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { tenants, sectors, people } from "./drizzle/schema";
import { nanoid } from "nanoid";

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  // Buscar a empresa
  const [tenant] = await db.select().from(tenants).where(eq(tenants.name, "Centro Odontológico Patrícia Galvão")).limit(1);
  
  if (!tenant) {
    console.log("Empresa não encontrada!");
    return;
  }
  
  console.log("Empresa encontrada:", tenant.name, tenant.id);
  
  // Criar setor
  const sectorId = nanoid();
  await db.insert(sectors).values({
    id: sectorId,
    tenantId: tenant.id,
    name: "Atendimento",
    description: "Setor de atendimento ao paciente e recepção",
    responsibleName: "Dr. João Silva",
  });
  
  console.log("Setor criado:", sectorId);
  
  // Criar colaborador
  const personId = nanoid();
  await db.insert(people).values({
    id: personId,
    tenantId: tenant.id,
    sectorId: sectorId,
    name: "Maria Santos",
    position: "Recepcionista",
    email: "maria.santos@centropatgalvao.com.br",
    phone: "(11) 98765-4321",
    employmentType: "own",
  });
  
  console.log("Colaborador criado:", personId);
  console.log("\n✅ Dados inseridos com sucesso!");
}

main().catch(console.error).finally(() => process.exit(0));
