# Build stage
FROM node:20-alpine AS build

# Fix potential overlayfs bugs in buildkit by skipping some caching
ENV BUILDKIT_PROGRESS=plain

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if we had one (using default for now)

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
