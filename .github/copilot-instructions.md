# Solvix.ai AI - AI Agent Instructions

## Architecture Overview

**Solvix.ai AI** is a multi-tenant, white-label document extraction platform that transforms unstructured documents (PDFs, Excel) into structured data using AI. Built as a Next.js 16 app with Supabase backend, Azure Blob integration, and multi-model AI extraction (Google Gemini, OpenAI GPT, Anthropic Claude).

**Key Insight**: This is a BYOK (Bring Your Own Key) architecture - users provide their own AI API keys, which are encrypted with AES-256-GCM and stored in the database. The platform never uses platform-owned AI keys.

### Critical Data Flow
```
Azure Blob → Upload → AI Extraction → Review Dashboard → Export → Azure Blob
    ↓           ↓           ↓               ↓              ↓          ↓
 Rescue    Supabase    Multi-Model      Human-in-Loop   Excel   Safe Cleanup
```

## Essential Patterns

### 1. Server Actions vs API Routes
- **Server Actions** ([app/actions.ts](app/actions.ts)): Used for form submissions, document processing, and mutations. All start with `"use server"`. Example: `uploadDocument()`, `approveDocument()`.
- **API Routes** ([app/api/**/route.ts](app/api/)): Used for external integrations, webhooks, cron jobs, and endpoints requiring `maxDuration = 300`. All long-running operations MUST export `maxDuration`.

### 2. Supabase Client Creation (CRITICAL)
```typescript
// Admin operations (bypasses RLS)
import { createServiceRoleClient } from "@/lib/supabase";
const supabase = createServiceRoleClient();

// User-scoped operations (respects RLS)
import { createServerComponentClient } from "@/lib/supabase";
const supabase = await createServerComponentClient(); // MUST await in Next.js 15+
```
**Rule**: Use `createServiceRoleClient()` for admin tasks, background jobs, API routes. Use `createServerComponentClient()` for user-facing operations.

### 3. AI Model Router Pattern
All AI extraction goes through [lib/extraction/router.ts](lib/extraction/router.ts):
```typescript
import { extractWithModel } from "@/lib/extraction/router";

const result = await extractWithModel({
  content: fileBuffer,
  contentType: 'pdf' | 'excel',
  filename: 'invoice.pdf',
  settings: userSettings,
  customInstructions: userInstructions
}, userId, modelId);
```
**Adapters**: [lib/extraction/adapters/](lib/extraction/adapters/) - Gemini, OpenAI, Anthropic. Each implements `ExtractionAdapter` interface.

### 4. Encryption for Sensitive Data
```typescript
import { encryptAPIKey, decryptAPIKey } from "@/lib/encryption";

// Store API keys
const encrypted = encryptAPIKey(plainKey);
await supabase.from("user_api_keys").insert({ encrypted_key: encrypted });

// Retrieve API keys
const { encrypted_key } = await supabase.from("user_api_keys").select().single();
const plainKey = decryptAPIKey(encrypted_key);
```
**Critical**: Always encrypt API keys and Azure connection strings. Never log decrypted values.

### 5. Tenant Configuration
White-label branding stored in `settings` table. Access via [config/tenant.ts](config/tenant.ts):
```typescript
import { getTenantConfigFromDB } from "@/config/tenant";
const config = await getTenantConfigFromDB(); // DB-first
// OR
import { getTenantConfig } from "@/config/tenant";
const config = getTenantConfig(); // Env vars (synchronous)
```

### 6. Excel Processing - Adaptive Extraction
Excel files use adaptive structure analysis (see [app/actions.ts](app/actions.ts)):
1. Claude Sonnet analyzes first 10 rows to identify column mappings (not hardcoded)
2. Chunked processing (50 rows) with Claude Haiku for cost optimization
3. Smart totals calculation that finds header rows dynamically
4. Swedish number parsing: `"1 000,50"` → `1000.5`

**Key Function**: `calculateBigDataTotals()` scans for headers using regex aliases, doesn't assume row 1 is headers.

### 7. Date Extraction Hierarchy (CRITICAL)
Document dates have a fallback chain:
1. Excel cells or PDF headers
2. Filename parsing (handles `(1)`, `(2)` suffixes)
3. Document metadata from extraction
4. Today's date as last resort

**Rule**: Never export empty dates. Always validate dates (reject >2 years old or future).

## Development Workflows

### Running the App
```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build
docker compose up -d     # Full stack with Docker
```

### Database Migrations
1. Create migration: `supabase/migrations/001-your-change.sql`
2. Apply: Run SQL in Supabase SQL Editor
3. **Complete setup**: [supabase/migrations/000-complete-setup.sql](supabase/migrations/000-complete-setup.sql) - single file for fresh installs

### Testing Document Processing
```bash
# Manual test via API
curl -X POST http://localhost:3000/api/process-document \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"documentId": "uuid"}'

# Python rescue script for Azure failed files
python azure_rescue_failed_files.py
```

## Critical Conventions

### File Organization
- **Components**: [components/](components/) - All reusable React components (kebab-case)
- **Server Actions**: [app/actions.ts](app/actions.ts) - All form/mutation actions
- **API Routes**: [app/api/](app/api/) - REST endpoints (use `route.ts`)
- **Config**: [config/](config/) - `tenant.ts` (branding), `models.ts` (AI registry)
- **Utils**: [lib/](lib/) - Extraction, encryption, validation, Azure

### Naming Patterns
- **Database tables**: Snake_case (`waste_records`, `user_api_keys`)
- **TypeScript**: PascalCase (types), camelCase (functions)
- **Server Actions**: Imperative verbs (`uploadDocument`, `approveDocument`)
- **API Routes**: RESTful paths (`/api/process-document`, `/api/export-to-azure`)

### Authentication Flow
1. Supabase Auth handles login/signup
2. JWT stored in cookies via `@supabase/ssr`
3. Middleware at [middleware.ts](middleware.ts) refreshes sessions
4. API routes use `getApiUser()` from `lib/api-auth.ts`

### Azure Integration
- **Self-service**: Users configure Azure connections via Settings UI
- **Storage**: [lib/azure-connection.ts](lib/azure-connection.ts) handles all blob operations
- **Safe cleanup**: Never delete files without exact filename match and source container verification
- **Connection strings**: Always encrypted before storage

## Code Style (from .cursor/rules)

### Development Philosophy
- **MVP mindset**: Simplest implementation wins. Avoid overengineering.
- **File size**: Keep files under 150-200 lines. Split if longer.
- **Minimal changes**: When fixing bugs, change as few lines as possible.
- **Test after every change**: Encourage user to test immediately.

### Error Fixing Process (MANDATORY)
1. Write 3 detailed paragraphs analyzing possible causes (keep open mind)
2. Explain the error in plain English
3. Fix with minimal code changes
4. Provide clear testing instructions

### Building Process (MANDATORY)
1. Answer user's questions fully
2. Write 2 detailed paragraphs planning the approach
3. List remaining steps, choose one to implement
4. Write code for current step ONLY
5. Explain every change made and why
6. Give concise testing instructions

## Common Gotchas

1. **Next.js 15+ cookies**: `await cookies()` is required (async function)
2. **Long-running API routes**: Must export `export const maxDuration = 300`
3. **RLS policies**: Use service role client to bypass RLS for admin operations
4. **Swedish number formats**: Always use `parseSwedishNumber()` for Excel data
5. **Material synonyms**: Check `settings.material_synonyms` JSONB column for standardization
6. **Quality scores**: `(completeness + confidence) / 2` determines auto-approval
7. **Stripe integration**: Check `canProcessDocument()` before processing to enforce usage limits

## Key Files Reference

- [app/actions.ts](app/actions.ts) - All server actions, Excel processing logic
- [lib/extraction/router.ts](lib/extraction/router.ts) - AI model routing and API key management
- [lib/encryption.ts](lib/encryption.ts) - AES-256-GCM encryption for secrets
- [config/tenant.ts](config/tenant.ts) - White-label configuration
- [config/models.ts](config/models.ts) - AI model registry with pricing
- [supabase/migrations/000-complete-setup.sql](supabase/migrations/000-complete-setup.sql) - Complete DB schema
- [app/api/process-document/route.ts](app/api/process-document/route.ts) - Document processing endpoint
- [components/review-form.tsx](components/review-form.tsx) - Human review interface
