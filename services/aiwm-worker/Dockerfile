FROM node:20-alpine

# Install required tools
RUN apk add --no-cache \
    curl \
    bash \
    ca-certificates

# Create app directory
WORKDIR /app

# Copy application files
COPY ../../dist/services/aiwm-worker/main.js .
COPY .env .

# Create non-root user
RUN addgroup -g 1001 -S aiwm-worker && \
    adduser -S -u 1001 -G aiwm-worker aiwm-worker

# Set ownership
RUN chown -R aiwm-worker:aiwm-worker /app

# Switch to non-root user
USER aiwm-worker

# Expose no ports (worker is client-only)

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD ps aux | grep "node.*main.js" | grep -v grep || exit 1

# Start application
CMD ["node", "main.js"]
