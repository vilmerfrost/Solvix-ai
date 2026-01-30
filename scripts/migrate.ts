/**
 * Database Migration Script
 * Run migrations against Supabase database
 * 
 * Usage:
 *   npx tsx scripts/migrate.ts
 *   npm run migrate
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const MIGRATIONS_DIR = path.join(__dirname, "../supabase/migrations");

interface Migration {
  version: string;
  name: string;
  filename: string;
  sql: string;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🔄 Vextra AI Database Migration");
  console.log("================================\n");

  // Ensure schema_migrations table exists
  console.log("📋 Checking migration tracking table...");
  const { error: tableError } = await supabase.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
  });

  if (tableError) {
    // Table might already exist or we don't have rpc permissions
    // Try a select to verify it exists
    const { error: selectError } = await supabase
      .from("schema_migrations")
      .select("version")
      .limit(1);

    if (selectError) {
      console.error("❌ Failed to create/access schema_migrations table");
      console.error("   Please run 001_schema_migrations.sql manually first.");
      process.exit(1);
    }
  }

  // Get applied migrations
  const { data: applied, error: appliedError } = await supabase
    .from("schema_migrations")
    .select("version");

  if (appliedError) {
    console.error("❌ Failed to get applied migrations:", appliedError.message);
    process.exit(1);
  }

  const appliedVersions = new Set(applied?.map((m) => m.version) || []);
  console.log(`✓ ${appliedVersions.size} migrations already applied\n`);

  // Get migration files
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  files.sort();

  const migrations: Migration[] = [];
  for (const filename of files) {
    // Parse version from filename (e.g., "001_schema_migrations.sql" -> "001")
    const match = filename.match(/^(\d+)[_-]/);
    if (!match) {
      console.warn(`⚠️ Skipping ${filename} (invalid naming pattern)`);
      continue;
    }

    const version = match[1];
    const name = filename.replace(/^\d+[_-]/, "").replace(".sql", "");
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");

    migrations.push({ version, name, filename, sql });
  }

  // Apply pending migrations
  const pending = migrations.filter((m) => !appliedVersions.has(m.version));

  if (pending.length === 0) {
    console.log("✅ Database is up to date!\n");
    return;
  }

  console.log(`📥 ${pending.length} pending migration(s):\n`);

  for (const migration of pending) {
    console.log(`   ${migration.version}: ${migration.name}`);
  }
  console.log("");

  for (const migration of pending) {
    console.log(`🔄 Applying ${migration.version}: ${migration.name}...`);

    try {
      // Note: Supabase doesn't support running raw SQL via the JS client
      // You'll need to run migrations via Supabase Dashboard SQL Editor
      // or use the Supabase CLI
      
      // This is a placeholder - in production, use supabase CLI or dashboard
      console.log(`   ⚠️  Please run this migration manually in Supabase SQL Editor:`);
      console.log(`      File: ${migration.filename}`);
      
      // Record migration as applied (manually confirm after running SQL)
      // await supabase.from("schema_migrations").insert({
      //   version: migration.version,
      //   name: migration.name,
      // });

      console.log(`   ✓ Migration file ready: ${migration.filename}\n`);
    } catch (error: any) {
      console.error(`❌ Migration ${migration.version} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log("\n================================");
  console.log("📋 Migration Summary:");
  console.log(`   - Files ready: ${pending.length}`);
  console.log(`   - Run these SQL files in Supabase SQL Editor in order`);
  console.log("================================\n");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
