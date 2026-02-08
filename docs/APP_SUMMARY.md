# Solvix.ai AI - Application Summary

## Overview

**Solvix.ai AI** (also known as Frost Document Pipeline) is an intelligent document extraction and processing platform designed to automate the extraction, validation, and export of structured data from unstructured documents. The system primarily targets waste management companies that receive hundreds of PDFs and Excel files containing waste data in various formats, but it's built as a general-purpose document extraction platform.

The application transforms chaotic, unstructured documents (PDFs, Excel files) into clean, validated, structured data ready for integration with downstream systems like Power BI, Simplitics, or any other data processing pipeline.

---

## Core Functionality

### Primary Use Case
The system solves the problem of manual data entry from documents by:
1. **Automatically extracting** structured data from PDFs and Excel files using AI
2. **Validating** extracted data for completeness and accuracy
3. **Providing a review dashboard** for human verification of edge cases
4. **Exporting** validated data to Excel format or Azure Blob Storage
5. **Supporting batch processing** for handling multiple documents simultaneously

### Document Processing Workflow

```
Document Upload → AI Extraction → Validation → Review Dashboard → Export
     ↓                ↓              ↓              ↓              ↓
Azure Blob    Multi-Model AI   Quality Score   Human Review   Excel/Azure
```

### Key Features

1. **Multi-Model AI Extraction**
   - Supports three AI providers: Google Gemini, OpenAI GPT, Anthropic Claude
   - Users can choose the best model for their use case
   - Adaptive extraction system with fallback strategies
   - Handles both PDF (vision OCR) and Excel files

2. **BYOK (Bring Your Own Key) Architecture**
   - Users provide their own API keys for AI providers
   - All API keys encrypted with AES-256-GCM before storage
   - No vendor lock-in - users control their AI provider relationships

3. **Self-Service Azure Integration**
   - Configure Azure Blob Storage connections through UI
   - No code changes needed for new Azure accounts
   - Automatic sync from/to Azure containers
   - Support for multiple Azure connections per user

4. **Human-in-the-Loop Review**
   - Dashboard for reviewing extracted data
   - Edit and correct extraction errors
   - Bulk approval for multiple documents
   - Auto-approval for high-quality extractions (configurable threshold)

5. **Multi-Language Support**
   - Handles Swedish, Finnish, Norwegian, Danish, and English documents
   - Automatic language detection
   - Standardized output in English field names

6. **Data Validation & Quality Scoring**
   - Completeness scoring (percentage of mandatory fields filled)
   - Confidence scoring (average confidence across all fields)
   - Quality score calculation for auto-approval decisions
   - Validation issues tracking

7. **Export Capabilities**
   - Excel export with Simplitics-compatible format
   - Custom export templates
   - Direct export to Azure Blob Storage
   - Batch export operations

8. **Enterprise Features**
   - White-label branding via setup wizard
   - Tenant-level configuration
   - Usage tracking and billing integration (Stripe)
   - Webhook support for external integrations
   - Health monitoring dashboard

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Charts**: Recharts
- **File Upload**: React Dropzone
- **State Management**: React Server Components + Server Actions

### Backend
- **Runtime**: Node.js (via Next.js API Routes)
- **API Framework**: Next.js API Routes (REST)
- **Server Actions**: Next.js Server Actions for form handling
- **Python Services**: FastAPI (optional, for legacy processing)

### Database & Storage
- **Primary Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage (for document uploads)
- **External Storage**: Azure Blob Storage (for integration)
- **Database Migrations**: SQL migration files in `supabase/migrations/`

### AI/ML Services
- **Google Gemini**: Gemini 3 models for extraction
- **OpenAI**: GPT-5.2 models for extraction
- **Anthropic**: Claude 4.5 (Sonnet & Haiku) for extraction
- **Adaptive Extraction**: Cost-optimized routing between models

### Data Processing Libraries
- **Excel Generation**: ExcelJS
- **Excel Parsing**: XLSX (SheetJS)
- **Validation**: Zod schemas
- **Date Handling**: Custom date extraction and validation utilities

### Authentication & Security
- **Auth Provider**: Supabase Auth
- **Encryption**: AES-256-GCM for API keys and credentials
- **API Authentication**: JWT tokens via Supabase
- **Row-Level Security**: PostgreSQL RLS policies

### Monitoring & Observability
- **Error Tracking**: Sentry (Next.js integration)
- **Logging**: Custom logger with structured logging
- **Analytics**: PostHog (client-side)
- **Health Monitoring**: Custom health check endpoints

### Payment Processing
- **Payment Provider**: Stripe
- **Features**: Subscription management, usage-based billing, checkout flows

### Email
- **Provider**: Resend
- **Use Cases**: Password reset, notifications, alerts

### Deployment
- **Containerization**: Docker & Docker Compose
- **Frontend Hosting**: Vercel (Next.js optimized)
- **Database Hosting**: Supabase Cloud
- **Build Output**: Standalone Next.js build

---

## Architecture

### Application Structure

```
frost-document-pipeline-1/
├── app/                          # Next.js App Router
│   ├── api/                     # API routes
│   │   ├── process-document/    # Single document processing
│   │   ├── process-batch/       # Batch processing
│   │   ├── azure/               # Azure integration endpoints
│   │   ├── user/api-keys/       # AI key management
│   │   ├── export-to-azure/     # Export functionality
│   │   └── health/              # System health checks
│   ├── dashboard/               # Review dashboard
│   ├── settings/                # User settings pages
│   ├── setup/                   # First-time setup wizard
│   └── page.tsx                 # Landing page
├── components/                   # React components
├── lib/                          # Core business logic
│   ├── extraction/              # AI extraction adapters
│   │   ├── adapters/           # Provider-specific adapters
│   │   │   ├── anthropic.ts
│   │   │   ├── gemini.ts
│   │   │   └── openai.ts
│   │   ├── router.ts            # Model routing logic
│   │   └── types.ts             # Extraction types
│   ├── azure-*.ts               # Azure integration
│   ├── encryption.ts            # AES-256 encryption
│   ├── excel-creator.ts         # Excel generation
│   ├── process-document.ts      # Document processing pipeline
│   ├── validation.ts            # Data validation
│   └── schemas.ts               # Zod validation schemas
├── supabase/
│   └── migrations/              # Database migrations
└── config/                       # Configuration files
```

### Key Components

1. **Extraction System** (`lib/extraction/`)
   - Adapter pattern for multiple AI providers
   - Unified extraction interface
   - Cost optimization and fallback strategies
   - Date handling and normalization
   - Multi-language support

2. **Document Processing Pipeline** (`lib/process-document.ts`)
   - Orchestrates the full document lifecycle
   - Handles upload, extraction, validation, storage
   - Manages document status transitions
   - Error handling and retry logic

3. **Azure Integration** (`lib/azure-*.ts`)
   - Connection management
   - Blob storage operations
   - Auto-fetch from Azure containers
   - Export to Azure containers

4. **Validation System** (`lib/validation.ts`, `lib/schemas.ts`)
   - Zod schema validation
   - Completeness calculation
   - Confidence scoring
   - Quality metrics

5. **Review Dashboard** (`app/dashboard/`)
   - Document listing with status
   - Individual document review
   - Bulk operations
   - Edit and approve workflow

---

## Data Model

### Core Entities

1. **Documents**
   - Stores uploaded documents and their extracted data
   - Tracks processing status (uploaded → queued → processing → needs_review → approved → exported)
   - Contains extracted line items and metadata

2. **Users**
   - User accounts via Supabase Auth
   - User preferences and settings
   - API key storage (encrypted)

3. **Azure Connections**
   - Encrypted connection strings
   - Container configurations
   - Folder mappings

4. **Settings**
   - Material synonyms mapping
   - Auto-approval thresholds
   - Custom extraction instructions
   - Known receivers list

5. **Usage Tracking**
   - Token usage per extraction
   - Cost tracking per AI provider
   - Processing time metrics

6. **Subscriptions**
   - Stripe subscription management
   - Usage limits
   - Billing information

7. **Webhooks**
   - External webhook configurations
   - Event subscriptions
   - Delivery tracking

---

## API Endpoints

### Document Processing
- `POST /api/process-document` - Process single document
- `POST /api/process-batch` - Batch process multiple documents
- `POST /api/process` - Legacy processing endpoint
- `GET /api/document-status` - Get document processing status

### Azure Integration
- `GET /api/azure/browse` - Browse Azure blob containers
- `GET /api/azure/connections` - List Azure connections
- `POST /api/azure/connections` - Create Azure connection
- `POST /api/azure/connections/test` - Test Azure connection
- `POST /api/export-to-azure` - Export document to Azure
- `GET /api/azure/monitor` - Monitor Azure sync status

### User Management
- `GET /api/user/api-keys` - Get user API keys
- `POST /api/user/api-keys` - Store encrypted API key
- `POST /api/user/api-keys/validate` - Validate API key
- `GET /api/user/usage` - Get usage statistics
- `GET /api/user/export` - Export user data

### Settings
- `GET /api/settings` - Get user settings
- `POST /api/settings` - Update settings
- `POST /api/settings/synonyms` - Update material synonyms
- `POST /api/settings/threshold` - Update auto-approval threshold

### Review & Approval
- `POST /api/bulk-approve` - Approve multiple documents
- `POST /api/cancel-processing` - Cancel document processing
- `POST /api/documents/reset` - Reset document status

### System
- `GET /api/health` - System health check
- `GET /api/cron/auto-fetch` - Cron job for Azure auto-fetch

### Billing
- `POST /api/billing/checkout` - Create Stripe checkout session
- `GET /api/billing/subscription` - Get subscription status
- `POST /api/billing/portal` - Access Stripe customer portal

---

## Security Features

1. **Encryption**
   - AES-256-GCM encryption for all API keys
   - Encrypted Azure connection strings
   - Encryption secret stored in environment variables

2. **Authentication**
   - Supabase Auth with JWT tokens
   - Row-Level Security (RLS) policies
   - Session management

3. **Data Protection**
   - No sensitive data sent to client
   - Server-side processing only
   - Encrypted storage for credentials

4. **API Security**
   - Rate limiting considerations
   - Input validation with Zod
   - SQL injection prevention via Supabase client

---

## Configuration

### Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `API_KEY_ENCRYPTION_SECRET` - 32-character secret for encryption

**Optional:**
- `SENTRY_DSN` - Sentry error tracking
- `POSTHOG_KEY` - PostHog analytics
- `STRIPE_SECRET_KEY` - Stripe payment processing
- `RESEND_API_KEY` - Email sending
- `LOGTAIL_TOKEN` - Logging service

**Note**: AI provider API keys and Azure connection strings are configured through the UI and stored encrypted in the database.

---

## Deployment

### Development
```bash
npm install
npm run dev  # Starts Next.js dev server on localhost:3000
```

### Production (Docker)
```bash
docker compose up -d --build
```

### Database Setup
1. Create Supabase project
2. Run migrations from `supabase/migrations/` in order
3. Configure environment variables
4. Complete setup wizard on first launch

---

## Key Workflows

### Document Processing Flow

1. **Upload**: Document uploaded via UI or fetched from Azure
2. **Storage**: Stored in Supabase Storage bucket
3. **Extraction**: AI model extracts structured data
4. **Validation**: Data validated against schemas, quality scored
5. **Review**: If quality score < threshold, sent to review dashboard
6. **Approval**: Human reviews and approves (or auto-approved if high quality)
7. **Export**: Exported to Excel or Azure Blob Storage

### Azure Auto-Fetch Flow

1. **Cron Job**: Scheduled job checks Azure containers
2. **File Detection**: Identifies new files in configured folders
3. **Download**: Downloads files from Azure
4. **Process**: Processes through normal extraction pipeline
5. **Cleanup**: Moves processed files or updates Azure metadata

### Multi-Model Extraction Strategy

1. **Model Selection**: User selects preferred model or uses default
2. **Adaptive Routing**: System may route to cheaper model for simple files
3. **Fallback**: If extraction fails, retry with different model
4. **Cost Tracking**: All token usage and costs tracked per extraction

---

## Integration Points

1. **Supabase**: Database, storage, authentication
2. **Azure Blob Storage**: Document source and export destination
3. **AI Providers**: Google Gemini, OpenAI, Anthropic Claude APIs
4. **Stripe**: Payment processing and subscription management
5. **Resend**: Email notifications
6. **Sentry**: Error tracking and monitoring
7. **PostHog**: Product analytics

---

## Current State & Limitations

### Implemented Features
- ✅ Multi-model AI extraction
- ✅ BYOK architecture
- ✅ Azure integration
- ✅ Review dashboard
- ✅ Excel export
- ✅ Batch processing
- ✅ Usage tracking
- ✅ Stripe billing integration
- ✅ Webhook support
- ✅ Health monitoring

### Known Limitations
- TypeScript build errors are ignored (`ignoreBuildErrors: true`)
- Image optimization disabled for faster builds
- Some Python services exist but may be legacy
- Migration system could be more robust

---

## Summary

Solvix.ai AI is a production-ready document extraction platform built with modern web technologies. It provides a complete solution for automating data extraction from unstructured documents, with strong emphasis on security (encryption, BYOK), flexibility (multi-model AI, self-service Azure), and user experience (review dashboard, auto-approval). The system is designed to scale and integrate with enterprise workflows while maintaining simplicity for end users.

The architecture follows Next.js best practices with server-side processing, TypeScript for type safety, and a modular design that allows for easy extension and maintenance. The platform is particularly well-suited for waste management companies but can be adapted for any document extraction use case.
