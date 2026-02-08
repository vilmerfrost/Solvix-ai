# Solvix.ai AI

**Intelligent Document Extraction Platform**

Extract, verify, and export structured data from complex documents using AI.

---

## Overview

Solvix.ai AI automates the extraction, validation, and export of data from unstructured documents (PDFs and Excel files). Using advanced AI models (Google Gemini, OpenAI GPT, Anthropic Claude), it transforms complex documents into structured, actionable data.

### System Flow

```
Document Upload → AI Extraction → Human Review → Export
       ↓              ↓              ↓           ↓
  Azure Blob    Multi-Model AI   Dashboard    Excel/Azure
```

---

## Features

### Core Capabilities
- **Multi-Model AI Extraction**: Choose between Gemini 3, GPT-5.2, or Claude 4.5 for optimal accuracy
- **BYOK (Bring Your Own Key)**: Use your own API keys - securely encrypted with AES-256
- **Self-Service Azure**: Configure Azure Blob Storage through the UI - no code changes needed
- **Multi-language Support**: Swedish, Finnish, Norwegian, English documents
- **Human-in-the-Loop Review**: Dashboard for edge case verification

### Integrations
- **Azure Blob Storage**: Automatic sync from/to your storage containers
- **Export to Excel**: Generates formatted XLSX files
- **Real-time Monitoring**: Health dashboard with system status

### Enterprise Ready
- **White-Label Ready**: Customizable branding via setup wizard
- **Batch Processing**: Process multiple documents simultaneously
- **Secure by Design**: All credentials encrypted at rest

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Storage | Azure Blob Storage |
| AI | Google Gemini, OpenAI GPT, Anthropic Claude |
| Deployment | Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase project
- AI provider API key (Google, OpenAI, or Anthropic)
- Azure Storage Account (optional - can configure later)

### Installation

1. **Clone and install**
```bash
git clone <repository-url>
cd solvix-ai
npm install
```

2. **Configure environment**
```bash
cp env.example .env.local
# Edit .env.local with your Supabase credentials
```

3. **Run database migrations**
```bash
# Run supabase/migrations/000-complete-setup.sql in Supabase SQL Editor
```

4. **Start development server**
```bash
npm run dev
```

5. **Complete setup wizard**

Visit `http://localhost:3000` - the setup wizard will guide you through configuration.

---

## Configuration

### Required Environment Variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encryption (required for API key storage)
API_KEY_ENCRYPTION_SECRET=your-32-char-secret  # Generate: openssl rand -base64 32
```

### Optional Configuration

AI keys and Azure connections can be configured through the Settings UI after installation - no environment variables needed!

---

## Docker Deployment

```bash
# Build and run
docker compose up -d --build

# View logs
docker compose logs -f
```

---

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main review dashboard
│   ├── settings/          # Settings (AI, Azure, Materials)
│   │   ├── api-keys/     # AI provider key management
│   │   └── azure/        # Azure connection management
│   ├── setup/            # First-time setup wizard
│   └── api/              # API routes
├── components/           # React components
├── config/              
│   ├── tenant.ts        # Tenant configuration
│   └── models.ts        # AI model registry
├── lib/                  
│   ├── extraction/      # AI extraction adapters
│   ├── azure-connection.ts
│   └── encryption.ts    # AES-256 encryption
└── supabase/
    └── migrations/      # Database migrations
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/process-document` | POST | Process single document |
| `/api/process-batch` | POST | Batch process documents |
| `/api/azure/browse` | GET | Browse Azure storage |
| `/api/azure/connections` | GET/POST | Manage Azure connections |
| `/api/user/api-keys` | GET/POST | Manage AI provider keys |
| `/api/export-to-azure` | POST | Export to Azure |
| `/api/health` | GET | System health check |

---

## Security

- **API Keys**: Encrypted with AES-256-GCM before database storage
- **Azure Connections**: Connection strings encrypted at rest
- **No Client Exposure**: Sensitive data never sent to browser
- **BYOK Model**: You control your AI provider relationships

---

## License

Proprietary - All rights reserved

---

**Solvix.ai AI** - *Verify + Extract = Solvix.ai*
