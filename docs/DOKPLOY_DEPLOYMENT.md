# 🚀 Deploying SupplyMind AI to Dokploy on a VPS

This guide provides end-to-end instructions for deploying **SupplyMind AI** in production on a VPS using [Dokploy](https://dokploy.com).

---

## 📋 Overview of Stack Architecture

The Dokploy stack consists of:
- **`frontend`** (Nginx + React SPA): Exposed via Traefik reverse proxy on port `80`. Automatically reverse-proxies `/api/` calls to the backend.
- **`backend`** (FastAPI): Exposes port `8000` internally on `supplymind_net` and `dokploy-network`. Handles ML forecasting, LLM orchestration with OmniRoute, RAG, and APIs.
- **`worker`** (Celery Worker): Processes asynchronous background tasks (queues: `default`, `ml`, `rag`).
- **`beat`** (Celery Beat): Scheduled recurring tasks (e.g. periodic model drift checks, report generation).
- **`postgres`** (PostgreSQL 16): Persistent relational database with extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`).
- **`redis`** (Redis 7): In-memory cache and message broker for Celery.

---

## 🛠️ Step 1: VPS Prerequisites

1. Ensure **Docker** and **Dokploy** are running on your VPS.
   - If Dokploy is not yet installed on your VPS:
     ```bash
     curl -sSL https://dokploy.com/install.sh | sh
     ```
2. Open your browser and log in to the Dokploy dashboard (usually `http://<YOUR_VPS_IP>:3000`).
3. Ensure the `dokploy-network` exists (Dokploy creates this by default). You can verify or create it by SSHing into your VPS and running:
   ```bash
   docker network create dokploy-network 2>/dev/null || true
   ```

---

## 📦 Step 2: Create a Project & Compose Service in Dokploy

1. Open Dokploy Web UI.
2. Click **Create Project** (e.g. `SupplyMind AI`).
3. Inside your project, click **Create Service** and select **Compose**.
4. Configure the Compose service:
   - **Name**: `supplymind`
   - **Source Type**: `Git` (or `GitHub`)
   - **Repository URL**: `https://github.com/your-org/SupplyMindAI.git` (or your repo)
   - **Branch**: `main`
   - **Compose Path**: `docker-compose.dokploy.yml` (or `docker-compose.prod.yml`)

---

## 🔑 Step 3: Configure Environment Variables

1. In your Dokploy service, click on the **Environment** tab.
2. Copy the contents of [`.env.dokploy.example`](../.env.dokploy.example) and paste it into the editor.
3. Fill in your production secrets:
   ```env
   # Domain pointing to your VPS IP
   DOMAIN=supplymind.yourdomain.com
   ALLOWED_ORIGINS=https://supplymind.yourdomain.com

   # Strong database & redis passwords
   POSTGRES_USER=supplymind_prod
   POSTGRES_PASSWORD=your-super-secure-postgres-password
   POSTGRES_DB=supplymind_prod
   REDIS_PASSWORD=your-super-secure-redis-password

   # JWT secret (min 32 characters)
   JWT_SECRET_KEY=your-secure-random-jwt-key-32chars-minimum

   # OmniRoute AI Gateway
   LLM_PROVIDER=omniroute
   OMNIROUTE_API_KEY=your-omniroute-api-key
   OMNIROUTE_BASE_URL=https://omniroute.wajehni-ai.space/v1
   LLM_BASE_URL=https://omniroute.wajehni-ai.space/v1
   LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free

   # Clerk Authentication (if using Clerk)
   CLERK_SECRET_KEY=sk_live_...
   CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_API_URL=/api/v1
   ```
4. Click **Save**.

---

## 🌐 Step 4: Configure Domain & SSL in Dokploy

Dokploy uses Traefik with automatic Let's Encrypt SSL certificates.

1. Go to the **Domains** tab in your Dokploy Compose service.
2. Add a new domain:
   - **Host**: `supplymind.yourdomain.com` (Ensure your DNS A record points to your VPS IP)
   - **Service Name**: `frontend`
   - **Container Port**: `80`
   - **Certificate**: Select `Let's Encrypt` (or enable HTTPS)
3. Click **Create Domain**.

*(Note: `docker-compose.dokploy.yml` already includes standard Traefik labels as a fallback)*.

---

## 🚀 Step 5: Deploy the Application

1. Click the **Deploy** button in the upper-right corner of Dokploy.
2. Dokploy will:
   - Clone your repository.
   - Build the optimized production Docker images (`frontend`, `backend`, `worker`).
   - Start the database, cache, backend, worker, beat, and frontend containers.
   - Automatically execute migrations and schema initialization on startup.
   - Attach Traefik to route HTTPS traffic from your domain to the frontend.

---

## ✅ Step 6: Verify Deployment

1. **Health Check Endpoint**:
   ```bash
   curl https://supplymind.yourdomain.com/api/v1/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "backend": "healthy",
     "database": true,
     "llm": true,
     "provider": "omniroute",
     "model": "nvidia/nemotron-3-super-120b-a12b:free"
   }
   ```

2. **Access the Web App**:
   Open `https://supplymind.yourdomain.com` in your browser.
   - You should see the SupplyMind AI dashboard with full RTL/LTR support, dark mode, and real-time AI agents powered by OmniRoute.

---

## 🛠️ Useful VPS Management Commands

If you need to inspect or manage containers directly via SSH on your VPS:

```bash
# View running containers
docker ps

# Check logs
docker logs -f supplymind-backend
docker logs -f supplymind-worker

# Run database migrations manually if needed
docker exec -it $(docker ps -qf "name=backend") alembic upgrade head

# Test database connection
docker exec -it $(docker ps -qf "name=postgres") pg_isready -U supplymind_prod
```
