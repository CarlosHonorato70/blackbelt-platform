/**
 * Import/Export REST Routes for People & Sectors
 * Generates XLSX templates and processes uploaded spreadsheets.
 */

import type { Express, Request, Response } from "express";
import multer, { memoryStorage } from "multer";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { verifySessionToken } from "./_core/cookies";
import { getUserById, getDb } from "./db";
import { log } from "./_core/logger";
import { tenants, sectors, people } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { checkSubscriptionLimits } from "./_core/subscriptionMiddleware";

// Multer configured for in-memory file handling (max 5MB)
// Supports: XLSX, XLS, CSV, ODS, TSV
const upload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel",                                          // .xls
      "text/csv",                                                          // .csv
      "application/csv",                                                   // .csv alt
      "text/plain",                                                        // .txt/.tsv
      "application/vnd.oasis.opendocument.spreadsheet",                    // .ods
    ];
    const ext = file.originalname?.toLowerCase() || "";
    const isValidExt = ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".csv") || ext.endsWith(".ods") || ext.endsWith(".tsv");
    if (allowed.includes(file.mimetype) || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Formatos aceitos: XLSX, XLS, CSV, ODS, TSV"));
    }
  },
});

// Employment type mapping: spreadsheet label -> DB value
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  estagiario: "Estagiario",
  "estagiário": "Estagiario",
  terceirizado: "Terceirizado",
  socio: "Socio",
  "sócio": "Socio",
};

const EMPLOYMENT_TYPE_OPTIONS = ["CLT", "PJ", "Estagiario", "Terceirizado", "Socio"];

// ============================================================================
// Auth (reuses same pattern as pdfDownloadRoutes)
// ============================================================================

async function authenticateRequest(req: Request, res: Response): Promise<{ userId: string; tenantId: string } | null> {
  const sessionToken = req.cookies?.[COOKIE_NAME];
  if (!sessionToken) {
    res.status(401).json({ error: "Autenticação necessária" });
    return null;
  }

  const result = verifySessionToken(sessionToken);
  if (!result) {
    res.status(401).json({ error: "Sessão inválida ou expirada" });
    return null;
  }

  const user = await getUserById(result.userId);
  if (!user || !user.tenantId) {
    res.status(403).json({ error: "Usuário não encontrado" });
    return null;
  }

  return { userId: user.id, tenantId: user.tenantId };
}

async function validateCompanyAccess(tenantId: string, companyId: string, db: any): Promise<string | false> {
  // If companyId equals user's tenantId, direct access
  if (companyId === tenantId) return companyId;

  const [company] = await db
    .select({ id: tenants.id, parentTenantId: tenants.parentTenantId })
    .from(tenants)
    .where(eq(tenants.id, companyId))
    .limit(1);

  // If company not found, fallback to user's own tenantId
  if (!company) return tenantId;

  if (company.id === tenantId || company.parentTenantId === tenantId) return companyId;
  return false;
}

// ============================================================================
// Template Download
// ============================================================================

async function generateTemplate(companyId: string, db: any): Promise<Buffer> {
  // Fetch existing sectors for pre-fill
  const existingSectors = await db
    .select({ name: sectors.name })
    .from(sectors)
    .where(eq(sectors.tenantId, companyId));

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Setores ---
  const sectorHeaders = ["Nome do Setor"];
  const sectorData = existingSectors.map((s: any) => [s.name]);
  const sectorSheet = XLSX.utils.aoa_to_sheet([sectorHeaders, ...sectorData]);

  // Column width
  sectorSheet["!cols"] = [{ wch: 40 }];

  XLSX.utils.book_append_sheet(wb, sectorSheet, "Setores");

  // --- Sheet 2: Colaboradores ---
  const peopleHeaders = [
    "Nome Completo",
    "Email",
    "Telefone",
    "Cargo",
    "Setor",
    "Tipo de Vínculo",
  ];
  const peopleSheet = XLSX.utils.aoa_to_sheet([peopleHeaders]);

  // Column widths
  peopleSheet["!cols"] = [
    { wch: 35 }, // Nome
    { wch: 30 }, // Email
    { wch: 18 }, // Telefone
    { wch: 25 }, // Cargo
    { wch: 25 }, // Setor
    { wch: 20 }, // Tipo de Vínculo
  ];

  XLSX.utils.book_append_sheet(wb, peopleSheet, "Colaboradores");

  // Write to buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}

// ============================================================================
// Import Processing
// ============================================================================

interface ImportResult {
  sectorsCreated: number;
  sectorsSkipped: number;
  peopleCreated: number;
  peopleSkipped: number;
  errors: string[];
}

async function processImport(companyId: string, fileBuffer: Buffer, db: any): Promise<ImportResult> {
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const result: ImportResult = {
    sectorsCreated: 0,
    sectorsSkipped: 0,
    peopleCreated: 0,
    peopleSkipped: 0,
    errors: [],
  };

  // For CSV/TSV files (single sheet), treat the only sheet as Colaboradores
  // and auto-create sectors from the "Setor" column
  const isSingleSheet = wb.SheetNames.length === 1 && !wb.SheetNames[0].toLowerCase().includes("setor");

  // --- Step 1: Process Sectors ---
  const sectorSheetName = isSingleSheet
    ? undefined // CSV: no separate sector sheet — sectors come from people rows
    : wb.SheetNames.find(
        (n) => n.toLowerCase().includes("setor") || n.toLowerCase().includes("sector")
      );

  // Get existing sectors for this company
  const existingSectors = await db
    .select({ id: sectors.id, name: sectors.name })
    .from(sectors)
    .where(eq(sectors.tenantId, companyId));

  const sectorNameToId = new Map<string, string>();
  for (const s of existingSectors) {
    sectorNameToId.set(s.name.trim().toLowerCase(), s.id);
  }

  if (sectorSheetName) {
    const sectorSheet = wb.Sheets[sectorSheetName];
    const sectorRows: any[] = XLSX.utils.sheet_to_json(sectorSheet, { header: 1 });

    // Skip header row
    for (let i = 1; i < sectorRows.length; i++) {
      const row = sectorRows[i];
      const sectorName = String(row[0] || "").trim();
      if (!sectorName) continue;

      const key = sectorName.toLowerCase();
      if (sectorNameToId.has(key)) {
        result.sectorsSkipped++;
        continue;
      }

      // Create new sector
      const sectorId = nanoid();
      const now = new Date();
      await db.insert(sectors).values({
        id: sectorId,
        tenantId: companyId,
        name: sectorName,
        createdAt: now,
        updatedAt: now,
      });
      sectorNameToId.set(key, sectorId);
      result.sectorsCreated++;
    }
  }

  // --- Step 2: Process People ---
  const peopleSheetName = isSingleSheet
    ? wb.SheetNames[0] // CSV: the only sheet IS the people sheet
    : wb.SheetNames.find(
        (n) => n.toLowerCase().includes("colaborador") || n.toLowerCase().includes("people")
      );

  if (peopleSheetName) {
    const peopleSheet = wb.Sheets[peopleSheetName];
    const peopleRows: any[] = XLSX.utils.sheet_to_json(peopleSheet, { header: 1 });

    // Skip header row
    for (let i = 1; i < peopleRows.length; i++) {
      const row = peopleRows[i];
      const name = String(row[0] || "").trim();
      const email = String(row[1] || "").trim() || null;
      const phone = String(row[2] || "").trim() || null;
      const position = String(row[3] || "").trim() || null;
      const sectorName = String(row[4] || "").trim();
      const employmentTypeRaw = String(row[5] || "").trim();

      if (!name) {
        if (row.some((cell: any) => cell)) {
          result.errors.push(`Linha ${i + 1}: Nome é obrigatório`);
        }
        result.peopleSkipped++;
        continue;
      }

      // Find or create sector
      let sectorId: string | null = null;
      if (sectorName) {
        const key = sectorName.toLowerCase();
        sectorId = sectorNameToId.get(key) || null;
        if (!sectorId) {
          if (isSingleSheet) {
            // CSV mode: auto-create sectors from people rows
            const newSectorId = nanoid();
            const now2 = new Date();
            await db.insert(sectors).values({
              id: newSectorId,
              tenantId: companyId,
              name: sectorName,
              createdAt: now2,
              updatedAt: now2,
            });
            sectorNameToId.set(key, newSectorId);
            sectorId = newSectorId;
            result.sectorsCreated++;
          } else {
            result.errors.push(
              `Linha ${i + 1}: Setor "${sectorName}" não encontrado. Crie-o na aba Setores.`
            );
            result.peopleSkipped++;
            continue;
          }
        }
      }

      // Map employment type
      let employmentType = "CLT"; // default
      if (employmentTypeRaw) {
        const mapped = EMPLOYMENT_TYPE_MAP[employmentTypeRaw.toLowerCase()];
        if (mapped) {
          employmentType = mapped;
        } else if (EMPLOYMENT_TYPE_OPTIONS.includes(employmentTypeRaw)) {
          employmentType = employmentTypeRaw;
        } else {
          result.errors.push(
            `Linha ${i + 1}: Tipo de vínculo "${employmentTypeRaw}" inválido. Usando CLT.`
          );
        }
      }

      // Create person
      const personId = nanoid();
      const now = new Date();
      await db.insert(people).values({
        id: personId,
        tenantId: companyId,
        sectorId,
        name,
        email,
        phone,
        position,
        employmentType,
        createdAt: now,
        updatedAt: now,
      });
      result.peopleCreated++;
    }
  }

  return result;
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerImportExportRoutes(app: Express) {
  // --- Download XLSX Template ---
  app.get("/api/template/people/:companyId", async (req: Request, res: Response) => {
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return;

      const { companyId } = req.params;
      const db = await getDb();

      // Validate access (returns resolved companyId or false)
      const resolvedId = await validateCompanyAccess(auth.tenantId, companyId, db);
      if (!resolvedId) {
        return res.status(403).json({ error: "Acesso negado a esta empresa" });
      }

      const buffer = await generateTemplate(resolvedId, db);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=modelo_colaboradores.xlsx");
      res.send(buffer);
    } catch (error: any) {
      console.error("[Template Download] Error:", error?.message, error?.stack);
      res.status(500).json({ error: "Erro ao gerar modelo: " + (error?.message || "desconhecido") });
    }
  });

  // --- Import XLSX ---
  app.post(
    "/api/import/people/:companyId",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const auth = await authenticateRequest(req, res);
        if (!auth) return;

        // Verificar limite de storage do plano
        const storageCheck = await checkSubscriptionLimits(auth.tenantId, "storage");
        if (!storageCheck.withinLimit) {
          return res.status(403).json({ error: "Limite de armazenamento do plano atingido. Faça upgrade para continuar." });
        }

        const { companyId } = req.params;
        const db = await getDb();

        // Validate access (returns resolved companyId or false)
        const resolvedId = await validateCompanyAccess(auth.tenantId, companyId, db);
        if (!resolvedId) {
          return res.status(403).json({ error: "Acesso negado a esta empresa" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }

        const result = await processImport(resolvedId, req.file.buffer, db);

        res.json({
          success: true,
          summary: {
            sectorsCreated: result.sectorsCreated,
            sectorsSkipped: result.sectorsSkipped,
            peopleCreated: result.peopleCreated,
            peopleSkipped: result.peopleSkipped,
          },
          errors: result.errors,
        });
      } catch (error: any) {
        log.error("[Import People] Error:", error);
        if (error.message?.includes("xlsx")) {
          return res.status(400).json({ error: "Arquivo inválido. Envie um arquivo .xlsx válido." });
        }
        res.status(500).json({ error: "Erro ao processar importação" });
      }
    }
  );
}
