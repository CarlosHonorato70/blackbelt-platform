import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const needsSsl = connectionString.includes('tidbcloud.com') || process.env.DATABASE_SSL === 'true';

function parseDbUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
  };
}

export default defineConfig({
  schema: ["./drizzle/schema.ts", "./drizzle/schema_nr01.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: needsSsl
    ? { ...parseDbUrl(connectionString), ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } as any }
    : { url: connectionString },
});
