# Document Pipeline AI

**White-label document processing system for waste management data extraction**

---

## Overview

Document Pipeline AI automates the extraction, validation, and export of waste management data from unstructured documents (PDFs and Excel files). It serves as an intelligent document processor that uses AI to extract structured data from complex waste management documents.

### System Flow

```
Document Upload → AI Extraction → Human Review → Export
       ↓              ↓              ↓           ↓
  Azure Blob    Claude AI     Dashboard    Excel/Azure
```

---

## Features

- **Automated AI Extraction**: Claude Sonnet processes invoices with 90%+ accuracy
- **Multi-language Support**: Swedish, Finnish, Norwegian, English documents
- **Human-in-the-Loop Review**: Dashboard for edge case verification
- **Azure Integration**: Automatic sync from/to Azure Blob Storage
- **Batch Processing**: Process multiple documents simultaneously
- **Export to Excel**: Generates Simplitics-compatible XLSX files
- **Real-time Monitoring**: Health dashboard with system status
- **White-Label Ready**: Customizable branding via setup wizard or environment variables

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Azure Blob Storage
- **AI**: Anthropic Claude API
- **Deployment**: Docker Compose

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for production)
- Azure Storage Account
- Supabase project
- Anthropic API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd document-pipeline
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp env.example .env.local
# Edit .env.local with your credentials
```

4. **Run database migrations**
```bash
# Apply migrations to your Supabase project
# See supabase/migrations/ for SQL files
```

5. **Start development server**
```bash
npm run dev
```

6. **Complete setup wizard**

Visit `http://localhost:3000/setup` to configure your system.

---

## Configuration

### Environment Variables

See `env.example` for all available options. Key variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AZURE_STORAGE_CONNECTION_STRING=...
ANTHROPIC_API_KEY=sk-ant-...

# Optional - Pre-configure tenant (skip setup wizard)
TENANT_NAME=Your Company Name
TENANT_SLUG=your-company
TENANT_PRIMARY_COLOR=#3B82F6
TENANT_LANGUAGE=sv
```

### Setup Wizard

If `TENANT_NAME` is not set, the system will redirect to `/setup` on first access. The wizard allows you to configure:

- Company name and branding
- Primary color theme
- Language (Swedish, English, Norwegian, Finnish)

---

## Docker Deployment

### Build and run

```bash
docker compose up -d --build
```

### Environment for Docker

Create a `.env` file with production values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AZURE_STORAGE_CONNECTION_STRING=...
ANTHROPIC_API_KEY=...
TENANT_NAME=Your Company Name
```

---

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard
│   ├── review/            # Document review
│   ├── settings/          # System settings
│   ├── setup/             # First-time setup wizard
│   └── api/               # API routes
├── components/            # React components
├── config/               
│   └── tenant.ts         # Tenant configuration
├── lib/                   # Utilities and libraries
│   ├── adaptive-extraction.ts
│   ├── azure-blob-connector.ts
│   └── supabase.ts
├── supabase/
│   └── migrations/       # Database migrations
└── docker-compose.yml
```

---

## Database Migrations

Run these migrations on your Supabase project:

1. `settings-migration.sql` - Creates settings table
2. `azure-folder-settings.sql` - Azure folder configuration
3. `tenant-branding.sql` - Tenant branding fields

---

## API Routes

- `POST /api/process-document` - Process single document
- `POST /api/process-batch` - Batch process documents
- `GET /api/azure/browse` - Browse Azure blob storage
- `POST /api/export-to-azure` - Export to Azure
- `GET /api/settings` - Get system settings
- `POST /api/setup` - Complete initial setup
- `GET /api/health` - System health check

---

## Customer Deployment Guide

See [INSTALLATION.md](INSTALLATION.md) for detailed customer deployment instructions.

---

## License

Proprietary - All rights reserved
