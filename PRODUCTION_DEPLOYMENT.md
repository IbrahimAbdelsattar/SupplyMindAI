# Production Deployment Guide for SupplyMind AI

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [Security Best Practices](#security-best-practices)
5. [Monitoring & Scaling](#monitoring--scaling)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure the following:

### Security
- [ ] Generate new strong JWT and session secrets (never use defaults)
  ```bash
  # Generate random secrets
  openssl rand -hex 32  # For JWT_SECRET
  openssl rand -hex 32  # For SESSION_SECRET
  ```
- [ ] Update database credentials to strong passwords
- [ ] Set `ENVIRONMENT=production` and `DEBUG=false`
- [ ] Configure ALLOWED_ORIGINS to your production domain(s)
- [ ] Enable HTTPS/SSL certificates
- [ ] Secure your `.env` file (chmod 600, restrict access)
- [ ] Enable database encryption at rest (if using managed services)

### Infrastructure
- [ ] Set up PostgreSQL 15+ with at least 2GB RAM
- [ ] Configure Redis with password authentication
- [ ] Set up SSL/TLS certificates (use Let's Encrypt for free)
- [ ] Configure automated backups for PostgreSQL
- [ ] Set up log aggregation (ELK, Datadog, CloudWatch, etc.)
- [ ] Configure monitoring and alerting

### Application
- [ ] Update frontend API URL to production domain
- [ ] Configure Supabase for vector embeddings (optional but recommended)
- [ ] Set up LLM API key (OpenRouter, OpenAI, etc.)
- [ ] Test all critical user flows
- [ ] Run security scanning on dependencies
- [ ] Build and test Docker images

### DNS & Domain
- [ ] Register domain name
- [ ] Configure DNS records (A, CNAME, MX if needed)
- [ ] Set up CDN if needed (Cloudflare, etc.)
- [ ] Configure email delivery (SMTP) for notifications

---

## Environment Setup

### 1. Create Production Environment File

```bash
# Copy the production template
cp .env.production .env.prod

# Edit with your production values
nano .env.prod  # or your preferred editor
```

**Critical variables to update:**
```bash
# Database
DATABASE_URL=postgresql://supplymind_prod:STRONG_PASSWORD@db.example.com:5432/supplymind_prod
POSTGRES_PASSWORD=STRONG_PASSWORD

# Security
JWT_SECRET=<generate with: openssl rand -hex 32>
SESSION_SECRET=<generate with: openssl rand -hex 32>

# Domain & CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# API Keys
OPENROUTER_API_KEY=sk-or-...
SUPABASE_SERVICE_ROLE_KEY=...

# LLM Configuration
LLM_MODEL=deepseek/deepseek-v4-flash:free  # or your preferred model
```

### 2. Prepare Docker Images

```bash
# Build production images
docker compose -f docker-compose.prod.yml build --no-cache

# Tag for registry
docker tag supplymind-backend:latest registry.example.com/supplymind-backend:v1.0.0
docker tag supplymind-frontend:latest registry.example.com/supplymind-frontend:v1.0.0

# Push to registry
docker push registry.example.com/supplymind-backend:v1.0.0
docker push registry.example.com/supplymind-frontend:v1.0.0
```

### 3. Configure Nginx

Create `nginx.conf`:
```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for streaming
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Deployment Options

### Option 1: Docker Compose (Self-Hosted)

**Best for:** Small to medium deployments, organizations with dedicated ops teams

```bash
# 1. SSH into production server
ssh user@production-server.com

# 2. Clone repository
git clone https://github.com/IbrahimAbdelsattar/SupplyMindAI.git
cd SupplyMindAI

# 3. Set environment
cp .env.production .env
# Edit .env with production values
nano .env

# 4. Start services
docker compose -f docker-compose.prod.yml up -d

# 5. Verify health
curl https://yourdomain.com/api/v1/health
```

### Option 2: Kubernetes (Enterprise)

**Best for:** Large deployments, multi-region, auto-scaling requirements

```bash
# Create namespace
kubectl create namespace supplymind-prod

# Deploy secrets
kubectl create secret generic supplymind-secrets \
  --from-file=.env.prod \
  -n supplymind-prod

# Deploy using Helm chart (create helm-values.prod.yaml first)
helm install supplymind ./helm/supplymind \
  -f helm/values.prod.yaml \
  -n supplymind-prod
```

### Option 3: Cloud Platforms

#### AWS ECS + RDS + ElastiCache
```bash
# Use CloudFormation or Terraform for infrastructure
# Deploy images to ECR
# Configure RDS for PostgreSQL
# Configure ElastiCache for Redis
# Set up ALB for load balancing
# Configure CloudFront for CDN
```

#### Azure Container Instances + Azure Database
```bash
# Create resource group
az group create --name supplymind-prod --location eastus

# Deploy using Container Instances
az container create \
  --resource-group supplymind-prod \
  --name supplymind-backend \
  --image registry.example.com/supplymind-backend:v1.0.0 \
  --environment-variables .env.prod
```

#### Google Cloud Run + Cloud SQL
```bash
# Deploy frontend
gcloud run deploy supplymind-frontend \
  --image=gcr.io/project-id/supplymind-frontend:v1.0.0 \
  --region=us-central1 \
  --platform=managed

# Deploy backend
gcloud run deploy supplymind-backend \
  --image=gcr.io/project-id/supplymind-backend:v1.0.0 \
  --region=us-central1 \
  --platform=managed \
  --set-env-vars-from-file=.env.prod
```

#### Heroku
```bash
# Login
heroku login

# Create apps
heroku create supplymind-prod-backend
heroku create supplymind-prod-frontend

# Add database
heroku addons:create heroku-postgresql:standard-0 -a supplymind-prod-backend
heroku addons:create heroku-redis:premium-0 -a supplymind-prod-backend

# Deploy
git push heroku main
```

---

## Security Best Practices

### 1. Database Security
```sql
-- Create separate user for application
CREATE USER supplymind_prod_app WITH PASSWORD 'app_specific_password';
GRANT CONNECT ON DATABASE supplymind_prod TO supplymind_prod_app;
GRANT USAGE ON SCHEMA public TO supplymind_prod_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO supplymind_prod_app;

-- Enable row-level security (if using Supabase)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_isolation ON users USING (auth.uid() = user_id);

-- Regular backups
pg_dump -U admin supplymind_prod | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 2. Network Security
```bash
# Configure firewall
# - Allow HTTP/HTTPS (80, 443) from anywhere
# - Allow SSH (22) from admin IPs only
# - Allow PostgreSQL (5432) from app servers only
# - Allow Redis (6379) from app servers only

# Use VPC/Security Groups in cloud providers
# Implement WAF (Web Application Firewall)
# Enable DDoS protection
```

### 3. API Security
```python
# In backend/main.py - add rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@limiter.limit("100/minute")
@app.get("/api/v1/...")
```

### 4. Secrets Management
```bash
# Use environment variables (Docker secrets)
# Never hardcode secrets in code
# Rotate secrets regularly
# Use secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

# Docker secrets
docker secret create jwt_secret -  # read from stdin
docker secret create db_password - 
```

### 5. SSL/TLS Certificates
```bash
# Get free SSL from Let's Encrypt
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renew
certbot renew --quiet --no-eff-email

# In nginx, point to certificates:
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

---

## Monitoring & Scaling

### 1. Health Checks
```bash
# Check backend health
curl https://yourdomain.com/api/v1/health

# Response should be 200 with JSON
# {
#   "status": "healthy",
#   "database": "connected",
#   "redis": "connected"
# }
```

### 2. Logging
```bash
# View backend logs
docker logs -f supplymind-backend-prod

# Check combined logs
docker compose -f docker-compose.prod.yml logs -f

# Use log aggregation service
# - ELK Stack (Elasticsearch, Logstash, Kibana)
# - Datadog
# - New Relic
# - CloudWatch (AWS)
# - Stackdriver (Google Cloud)
```

### 3. Monitoring Metrics
- CPU usage (keep < 80%)
- Memory usage (keep < 85%)
- Database connections
- Redis memory usage
- API response times (target: < 500ms)
- Error rates (target: < 0.1%)
- Disk usage and I/O

### 4. Scaling Options

**Horizontal Scaling (Add more instances):**
```bash
# With Docker Compose and load balancer
# Deploy multiple backend instances behind Nginx

# With Kubernetes
kubectl scale deployment supplymind-backend --replicas=3

# With cloud providers
# - AWS Auto Scaling Groups
# - Google Cloud MIG
# - Azure VMSS
```

**Vertical Scaling (Increase resources):**
```bash
# Increase PostgreSQL memory
# Increase Redis memory
# Increase container resource limits
```

---

## Troubleshooting

### Application won't start
```bash
# Check logs
docker logs supplymind-backend-prod

# Verify environment variables
docker exec supplymind-backend-prod env | grep DATABASE_URL

# Test database connection
docker exec supplymind-postgres-prod psql -U supplymind_prod -d supplymind_prod -c "SELECT 1"

# Test Redis connection
docker exec supplymind-redis-prod redis-cli ping
```

### High latency
```bash
# Check database query performance
docker exec supplymind-postgres-prod psql -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"

# Monitor network latency
ping yourdomain.com
curl -w "@curl-format.txt" https://yourdomain.com/api/v1/health
```

### Out of memory
```bash
# Check memory usage
docker stats

# Increase Redis max memory
docker exec supplymind-redis-prod CONFIG SET maxmemory 1gb

# Scale up database instance
```

### Database connection pool exhausted
```bash
# Check connections
docker exec supplymind-postgres-prod psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname"

# Adjust pool size in DATABASE_URL connection string
# postgresql://user:pass@host/db?pool_size=20&max_overflow=0
```

---

## Post-Deployment

1. **Verify Functionality**
   - Test user registration and login
   - Test demand forecasting feature
   - Test inventory optimization
   - Test AI insights/copilot
   - Test data export

2. **Set Up Monitoring**
   - Configure uptime monitoring
   - Set up alerting rules
   - Configure log dashboards

3. **Backup Strategy**
   - Daily database backups
   - Weekly full backups
   - Test restore procedures
   - Document backup recovery steps

4. **Documentation**
   - Document all configuration decisions
   - Create runbooks for common issues
   - Document emergency procedures
   - Create disaster recovery plan

5. **Performance Tuning**
   - Monitor metrics for 1 week
   - Adjust resource limits based on actual usage
   - Optimize slow queries
   - Configure caching strategies

---

## Support & Maintenance

- **Updates**: Plan monthly security updates
- **Dependencies**: Keep dependencies up to date
- **Testing**: Run integration tests in staging before production
- **Communication**: Notify users of planned maintenance
- **Documentation**: Keep deployment docs updated

For additional help, see:
- [Backend README](./backend/README.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [Architecture Documentation](./AI_ARCHITECTURE.md)
