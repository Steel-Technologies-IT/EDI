# Multi-stage build for React frontend

# Stage 1: Build the React app
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm config set strict-ssl false && \
    npm config set registry http://registry.npmjs.org/ && \
    npm install

# Copy source code
COPY . .

# Accept build argument for REACT_APP_HOST
ARG REACT_APP_HOST
ENV REACT_APP_HOST=${REACT_APP_HOST}

ARG REACT_APP_REDIRECT_URI
ENV REACT_APP_REDIRECT_URI=${REACT_APP_REDIRECT_URI}

ARG REACT_APP_Entra_ClientId
ENV REACT_APP_Entra_ClientId=${REACT_APP_Entra_ClientId}

ARG REACT_APP_Entra_Authority
ENV REACT_APP_Entra_Authority=${REACT_APP_Entra_Authority}

# Build the production-optimized React app
# The environment variable will be embedded during build
RUN npm run build


EXPOSE 3003

# Start nginx
CMD ["node", "frontend.js"]