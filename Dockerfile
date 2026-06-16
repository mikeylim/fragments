# Dockerfile for the fragments Node.js microservice.
# This file defines the instructions Docker uses to build an image
# that can run our Express API server inside a container.

# Use a specific Node.js version so the container is close to our local dev environment.
# Check your local version with: node --version
FROM node:24.16.0

# Metadata for this image
LABEL maintainer="Mike Dohyun Lim <mikedohyunlim@gmail.com>"
LABEL description="Fragments node.js microservice"

# We default to use port 8080 in our service
ENV PORT=8080

# Reduce npm spam when installing within Docker
# https://docs.npmjs.com/cli/v8/using-npm/config#loglevel
ENV NPM_CONFIG_LOGLEVEL=warn

# Disable colour when run inside Docker
# https://docs.npmjs.com/cli/v8/using-npm/config#color
ENV NPM_CONFIG_COLOR=false

# Use /app as our working directory
WORKDIR /app

# Copy package.json and package-lock.json first so Docker can cache dependency installs
COPY package*.json ./

# Install node dependencies defined in package-lock.json
RUN npm install

# Copy src to /app/src/
COPY ./src ./src

# Copy our HTPASSWD file so Basic Auth works when using env.jest inside Docker
COPY ./tests/.htpasswd ./tests/.htpasswd

# We run our service on port 8080
EXPOSE 8080

# Start the container by running our server
CMD npm start
