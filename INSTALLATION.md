# Vextra AI - Customer Installation Guide

This guide covers deploying Vextra AI for a new customer.

---

## Prerequisites

Before starting, ensure you have:

1. **Server/VPS Requirements**
   - Linux server (Ubuntu 22.04 recommended)
   - Docker and Docker Compose installed
   - 2GB+ RAM, 20GB+ disk space
   - Public IP or domain for HTTPS

2. **External Services**
   - Supabase project (database)
   - AI provider API key (Google Gemini, OpenAI, or Anthropic)
   - Azure Storage Account (optional - can configure in UI)

---

## Step 1: Supabase Setup

### Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down:
   - Project URL
   - Anon key
   - Service role key

### Run database migrations

Execute the complete setup SQL file in Supabase SQL Editor:

```sql
-- Run: supabase/migrations/000-complete-setup.sql
```

This single file creates all required tables:
- `settings` - Application configuration
- `documents` - Document storage and status
- `user_api_keys` - Encrypted AI provider keys
- `azure_connections` - Encrypted Azure credentials

---

## Step 2: Environment Configuration

### Create .env.local

```bash
cp env.example .env.local
```

### Configure required variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encryption (required)
API_KEY_ENCRYPTION_SECRET=your-32-char-secret  # openssl rand -base64 32
```

### Optional pre-configuration

Skip the setup wizard by setting tenant variables:

```bash
TENANT_NAME=Customer Company Name
TENANT_SLUG=customer-company
TENANT_PRIMARY_COLOR=#6366F1
TENANT_LANGUAGE=sv
```

---

## Step 3: Docker Deployment

### Build and start

```bash
docker compose up -d --build
```

### Verify deployment

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Test health endpoint
curl http://localhost:3000/api/health
```

---

## Step 4: Initial Setup

### Option A: Setup Wizard (Recommended)

1. Navigate to `http://your-domain:3000`
2. Complete the 3-step wizard:
   - Company information
   - Branding colors
   - Language selection

### Option B: Pre-configured

If `TENANT_NAME` is set in environment, the system skips the wizard and redirects to dashboard.

---

## Step 5: Configure Integrations

### AI Provider (In-App)

1. Go to Settings → AI & Automation → API-nycklar
2. Add your AI provider API key (Google, OpenAI, or Anthropic)
3. Keys are encrypted with AES-256 before storage

### Azure Storage (In-App)

1. Go to Settings → Azure & GUIDs → Azure-anslutningar
2. Add your Azure Storage connection string
3. Configure input/output folders

---

## Maintenance

### Updating

```bash
git pull
docker compose up -d --build
```

### Logs

```bash
docker compose logs -f --tail=100 web
```

### Backup

Database backups are handled by Supabase. For local backup:

```bash
# Export from Supabase dashboard or CLI
```

---

## Troubleshooting

### Container won't start

```bash
docker compose logs web
```

### Database connection issues

1. Verify Supabase credentials in `.env.local`
2. Check Supabase project is active
3. Ensure service role key has correct permissions

### AI extraction failing

1. Verify API key in Settings → API-nycklar
2. Check key status shows "Valid"
3. Ensure sufficient API credits

---

## Support

For technical support, contact your Vextra AI representative.

---

**Vextra AI** - *Intelligent Document Extraction*
