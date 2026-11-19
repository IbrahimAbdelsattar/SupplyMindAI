#!/usr/bin/env bash
# ==============================================================================
# SupplyMind AI — Dokploy VPS Production Initialization Script
# ==============================================================================
# Usage:
#   chmod +x scripts/dokploy-setup.sh
#   ./scripts/dokploy-setup.sh
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}       SupplyMind AI — Dokploy VPS Initialization Helper         ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Check Docker Installation
echo -e "\n${YELLOW}[1/4] Checking Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is installed: $(docker --version)${NC}"

if docker compose version &> /dev/null; then
    echo -e "${GREEN}✅ Docker Compose is available: $(docker compose version)${NC}"
else
    echo -e "${RED}❌ Docker Compose plugin is not installed.${NC}"
    exit 1
fi

# 2. Check or Create Dokploy Network
echo -e "\n${YELLOW}[2/4] Checking Dokploy external network (dokploy-network)...${NC}"
if docker network inspect dokploy-network &>/dev/null; then
    echo -e "${GREEN}✅ dokploy-network exists.${NC}"
else
    echo -e "${YELLOW}⚠️  dokploy-network does not exist yet. Creating it now...${NC}"
    docker network create dokploy-network
    echo -e "${GREEN}✅ dokploy-network created successfully.${NC}"
fi

# 3. Create required persistent host mount folders if needed
echo -e "\n${YELLOW}[3/4] Preparing required data directories...${NC}"
mkdir -p data/storage ml_platform/models reports
chmod -R 775 data/storage reports ml_platform/models || true
echo -e "${GREEN}✅ Directories verified.${NC}"

# 4. Check Environment File
echo -e "\n${YELLOW}[4/4] Verifying Environment configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found.${NC}"
else
    echo -e "${YELLOW}ℹ️  No .env file found in repository root.${NC}"
    echo -e "${YELLOW}   If deploying inside the Dokploy Web UI, copy .env.dokploy.example${NC}"
    echo -e "${YELLOW}   into the 'Environment' tab of your Compose service in Dokploy.${NC}"
    if [ -f ".env.dokploy.example" ]; then
        cp -n .env.dokploy.example .env || true
        echo -e "${GREEN}   Created initial local .env from .env.dokploy.example${NC}"
    fi
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}🎉 VPS Initialization Complete! Ready for Dokploy Deployment.${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "Next steps in Dokploy UI:"
echo -e " 1. Go to your Project -> Create Compose Service"
echo -e " 2. Connect your Git repository"
echo -e " 3. Set Compose Path: ${YELLOW}docker-compose.dokploy.yml${NC} (or docker-compose.prod.yml)"
echo -e " 4. Paste variables from ${YELLOW}.env.dokploy.example${NC} into the Environment tab"
echo -e " 5. In Domains: set your domain (e.g. supplymind.yourdomain.com) -> service: frontend -> port: 80"
echo -e " 6. Click ${GREEN}'Deploy'${NC}"
echo -e "${BLUE}================================================================${NC}"
