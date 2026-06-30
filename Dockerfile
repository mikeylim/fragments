# Dockerfile for the fragments Node.js microservice.
# This optimized version uses a smaller Alpine-based Node image,
# installs only production dependencies, runs as a non-root user,
# and includes a Docker health check for the running API.

# Use an official Node.js image with Alpine Linux to reduce image size.
# Pinning a specific version helps keep builds reproducible.
FROM node:22.12.0-alpine3.21

# Metadata for this image
LABEL maintainer="Mike Lim <mikedohyunlim@gmail.com>"
LABEL description="Fragments node.js microservice"

# Default runtime configuration.
# Secrets and environment-specific values should still be passed at runtime.
# ENV NODE_ENV=production
ENV NODE_ENV=test
ENV PORT=8080
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

# Use /app as our working directory
WORKDIR /app

# Copy dependency files first so Docker can cache npm installs
# when source code changes but dependencies do not.
COPY package*.json ./

# Install only production dependencies from package-lock.json.
# This avoids installing test/dev tools like Jest and ESLint in the final image.
RUN npm ci --omit=dev

# Copy the application source code
COPY --chown=node:node ./src ./src

# Copy our HTPASSWD file so Basic Auth works when using env.jest inside Docker
COPY --chown=node:node ./tests/.htpasswd ./tests/.htpasswd

# Run the container as the non-root node user included in the official Node image
USER node

# We run our service on port 8080
EXPOSE 8080

# Health check confirms that the API is actually responding, not just running.
# Using node avoids needing to install curl in the Alpine image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the container by running our server
CMD ["npm", "start"]
