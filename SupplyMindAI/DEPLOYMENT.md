# Supply Mind Deployment Guide

## Overview

This document outlines the deployment process for the Supply Mind AI platform. The platform is fully containerized using Docker and Docker Compose, making it easy to deploy to any environment that supports Docker.

## Architecture

The system consists of the following components:

- **Frontend:** A React/Vite Single Page Application (SPA) served by Nginx.
- **Backend:** A FastAPI Python backend that serves the REST API.
- **Postgres:** The relational database for application state.
- **Redis:** Used for caching and task queues.
- **ML Services:** Embedded within the backend container for forecasting and RAG.

## Prerequisites

- Docker and Docker Compose installed on the host machine.
- An OpenAI API Key or compatible LLM provider key (e.g., OpenRouter).

## Local Development

To run the application locally for development:

```bash
# Set your environment variables
export OPENROUTER_API_KEY=your_key_here

# Start the services
docker compose up -d
```

The frontend will be accessible at `http://localhost:8080` and the backend API at `http://localhost:8000`.

## Production Deployment

For production deployment, ensure you configure strong passwords and secure your `.env` file.

1.  Clone the repository on your production server.
2.  Create a `.env` file with production secrets.
3.  Run `docker compose -f docker-compose.prod.yml up -d --build`.

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automatically builds the Docker images and runs basic tests on every push to the `main` branch.
