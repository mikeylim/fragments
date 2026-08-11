# Dockerfile for the fragments Node.js microservice.
# This optimized version uses a multi-stage Alpine-based Node build,
# installs only production dependencies, and includes a Docker health check
# for the running API.

# Use an official Node.js image with Alpine Linux to reduce image size.
# Pinning a specific version helps keep builds reproducible.
FROM node:22.14.0-alpine3.21 AS dependencies

# Use /app as our working directory
WORKDIR /app

# Copy dependency files first so Docker can cache npm installs
# when source code changes but dependencies do not.
COPY package*.json ./

# Install only production dependencies from package-lock.json.
# This avoids installing test/dev tools like Jest and ESLint in the final image.
RUN npm ci --omit=dev

# Start a fresh production stage without npm's install cache or build files.
FROM node:22.14.0-alpine3.21 AS runtime

# Metadata for this image
LABEL maintainer="Mike Lim <mikedohyunlim@gmail.com>"
LABEL description="Fragments node.js microservice"

# Default runtime configuration.
# Secrets and environment-specific values should still be passed at runtime.
ENV NODE_ENV=production
ENV PORT=80
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

# Use /app as our working directory
WORKDIR /app

# Copy only the production dependencies from the dependency stage.
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

# package.json supplies the health response's author and version metadata.
COPY --chown=node:node ./package.json ./package.json

# Copy the application source code
COPY --chown=node:node ./src ./src

# ECS maps production HTTP traffic to port 80 in this container.
EXPOSE 80

# Health check confirms that the API is actually responding, not just running.
# Using node avoids needing to install curl in the Alpine image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get({ host: 'localhost', port: process.env.PORT || 80, path: '/' }, (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the container by running our server
CMD ["node", "src/index.js"]
