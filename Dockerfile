# Multi-stage build for NestJS Backend

# Build arguments for environment variables

# Stage 1: Build
FROM node:24.11.1-alpine AS builder

WORKDIR /app

# Install dependencies for native modules and document conversion
RUN apk add --no-cache python3 make g++ libreoffice

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Explicitly install peer dependencies that might be missing (band-aid fix)
RUN npm install pino pino-http --no-audit --no-fund --legacy-peer-deps

# Copy source code
COPY . . 

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:24.11.1-alpine AS production

# Set environment variables for build

# Install runtime dependencies for sharp (vips) and document conversion (libreoffice)
# Note: We copy node_modules from builder to avoid native module compilation issues
# Create app user
RUN apk add --no-cache vips-dev libreoffice && \
    addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 && \
    mkdir -p /app && \
    chown -R backend:nodejs /app
WORKDIR /app
USER backend

# Copy package files
COPY --chown=backend:nodejs package*.json ./

# Copy node_modules from builder (includes pre-compiled sharp native bindings)
# This avoids recompiling native modules in production stage
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=backend:nodejs /app/dist ./dist

# Copy necessary files
COPY --from=builder --chown=backend:nodejs /app/migrations ./migrations

# Create logs directory for Pino logger (must be done as root, then chown)
USER root
RUN mkdir -p /app/logs && chown -R backend:nodejs /app/logs && chmod 755 /app/logs

# Switch to non-root user for running the app
USER backend

# Set working directory explicitly (ensures ./logs resolves to /app/logs)
WORKDIR /app

# Health check is configured at runtime via docker run --health-cmd
# This allows different ports per environment (DEV=5202, UAT=5201)

# EXPOSE is documentation only - actual port is set by PORT env var at runtime
# DEV uses 5202, UAT uses 5201
EXPOSE 5201 5202

# Run the application using npm script
CMD ["npm", "run", "start:prod"]
