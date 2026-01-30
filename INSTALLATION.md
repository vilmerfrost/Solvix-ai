# Customer Installation Guide

This guide covers deploying the Document Pipeline for a new customer.

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
   - Azure Storage Account
   - Anthropic API key

---

## Step 1: Supabase Setup

### Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down:
   - Project URL
   - Anon key
   - Service role key

### Run database migrations

Execute these SQL files in Supabase SQL Editor (in order):

```sql
-- 1. settings-migration.sql
-- 2. azure-folder-settings.sql  
-- 3. add-azure-filename-tracking.sql
-- 4. tenant-branding.sql
```

---

## Step 2: Azure Storage Setup

### Create storage account

1. Create an Azure Storage Account
2. Create containers:
   - `arrivalwastedata` (or your preferred name)

### Get connection string

In Azure Portal: Storage Account → Access keys → Connection string

---

## Step 3: Server Setup

### Clone the repository

```bash
git clone <repository-url> /opt/document-pipeline
cd /opt/document-pipeline
```

### Create environment file

```bash
cp env.example .env
nano .env
```

Fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Azure
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_CONTAINER_NAME=arrivalwastedata

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Pre-configure tenant (optional - or use setup wizard)
TENANT_NAME=Customer Name AB
TENANT_SLUG=customer-name
TENANT_PRIMARY_COLOR=#3B82F6
TENANT_LANGUAGE=sv
```

---

## Step 4: Deploy with Docker

### Build and start

```bash
docker compose up -d --build
```

### Check status

```bash
docker compose ps
docker compose logs -f
```

### Access the application

- Without TENANT_NAME: Visit `/setup` to complete configuration
- With TENANT_NAME: Visit `/dashboard` directly

---

## Step 5: Configure HTTPS (Recommended)

### Using Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Get SSL certificate

```bash
sudo certbot --nginx -d your-domain.com
```

---

## Step 6: Configure Azure Folders

After deployment, go to Settings in the application to configure:

1. **Input folders**: Azure blob folders to monitor for new documents
2. **Output folder**: Where to export processed documents

---

## Maintenance

### View logs

```bash
docker compose logs -f
```

### Restart services

```bash
docker compose restart
```

### Update application

```bash
git pull origin main
docker compose up -d --build
```

### Backup database

Use Supabase dashboard or pg_dump for database backups.

---

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs frost-waste-pipeline
```

Common issues:
- Missing environment variables
- Invalid API keys
- Database connection failed

### Setup wizard won't load

Ensure:
1. TENANT_NAME is NOT set in .env (or setup is not complete in database)
2. Database migrations are applied
3. `is_setup_complete` is `false` in settings table

### Documents not processing

Check:
1. Anthropic API key is valid
2. Document format is supported (PDF, Excel)
3. View processing logs in /health page

---

## Support

For technical support, contact the system administrator.

---

## Customer-Specific Branch (Optional)

For customers requiring custom modifications:

```bash
# Create customer branch
git checkout -b customer/customer-name

# Make customizations
# ...

# Commit changes
git commit -m "Customer-specific customizations for Customer Name"
```

Keep the main branch clean for the white-label template.
