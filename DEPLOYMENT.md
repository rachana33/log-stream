# Deployment Instructions

## Backend (Azure Container Apps)
1. Build: `docker build -t rachana33/log-stream-backend backend`
2. Push: `docker push rachana33/log-stream-backend`
3. Deploy: `az containerapp up --name logstream-backend --image rachana33/log-stream-backend`

## Frontend (Vercel)
1. `cd frontend && npx vercel`
