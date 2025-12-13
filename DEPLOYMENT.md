# Azure Deployment Guide

This guide details how to deploy the LogStream application entirely on Azure.

## Architecture
- **Frontend**: Azure Static Web Apps (Next.js)
- **Backend**: Azure Container Apps (NestJS)
- **Database**: Azure Database for PostgreSQL
- **Real-time**: Azure SignalR Service
- **Ingestion**: Azure Event Hubs
- **AI**: Azure OpenAI Service

## Prerequisites
- Azure CLI installed (`brew install azure-cli`)
- Docker installed
- GitHub repository connected

## Step 1: Initial Setup

Log in to Azure:
```bash
az login
```

Create a resource group:
```bash
az group create --name LogStream-RG --location eastus
```

## Step 2: Provision Infrastructure

### 1. Database (PostgreSQL)
```bash
az postgres flexible-server create \
  --resource-group LogStream-RG \
  --name logstream-db-server \
  --admin-user logadmin \
  --admin-password <SECURE_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14
```
*Note the connection string provided in the output.*

### 2. SignalR Service
```bash
az signalr create \
  --name logstream-signalr \
  --resource-group LogStream-RG \
  --sku Free_F1 \
  --service-mode Serverless
```

### 3. Event Hubs
```bash
az eventhubs namespace create --name logstream-ns --resource-group LogStream-RG
az eventhubs eventhub create --name logs-hub --namespace-name logstream-ns --resource-group LogStream-RG
```

## Step 3: Backend Deployment (Azure Container Apps)

1. **Create Container Registry:**
```bash
az acr create --name logstreamacr --resource-group LogStream-RG --sku Basic --admin-enabled true
```

2. **Build and Push Image:**
```bash
az acr build --registry logstreamacr --image logstream-backend:v1 ./backend
```

3. **Create Container App Environment:**
```bash
az containerapp env create --name logstream-env --resource-group LogStream-RG --location eastus
```

4. **Deploy Backend Service:**
Replace placeholders with your actual values (DB Connection string, keys, etc).
```bash
az containerapp create \
  --name logstream-backend \
  --resource-group LogStream-RG \
  --environment logstream-env \
  --image logstreamacr.azurecr.io/logstream-backend:v1 \
  --target-port 3000 \
  --ingress internal \
  --env-vars \
    DATABASE_URL="postgresql://logadmin:..." \
    EVENTHUB_CONNECTION_STRING="..." \
    AZURE_SIGNALR_CONN_STR="..." \
    AZURE_OPENAI_ENDPOINT="..." \
    AZURE_OPENAI_KEY="..."
```
*Note: For public access to the API directly, set `--ingress external` instead of internal.*

## Step 4: Frontend Deployment (Azure Static Web Apps)

1. **Create Static Web App:**
```bash
az staticwebapp create \
  --name logstream-frontend \
  --resource-group LogStream-RG \
  --source https://github.com/rachana33/log-stream \
  --branch main \
  --app-location "frontend" \
  --output-location ".next" \
  --login-with-github
```

2. **Configure Environment Variables:**
Set the backend URL for the frontend to talk to.
```bash
az staticwebapp appsettings set \
  --name logstream-frontend \
  --setting-names NEXT_PUBLIC_BACKEND_URL="https://<YOUR_BACKEND_URL>"
```

## Step 5: Database Migration

Run migrations from your local machine (connecting to the remote DB) or set up a migration script in the build pipeline.

```bash
# Locally
export DATABASE_URL="postgresql://..."
cd backend
npx prisma migrate deploy
```

## Verification

Open your Azure Static Web App URL to see the deployed application.
