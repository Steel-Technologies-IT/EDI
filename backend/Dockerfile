
# --- Build backend ---
FROM node:20

# Install cifs-utils for SMB mounting
RUN apt-get update && \
    apt-get install -y cifs-utils && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm config set strict-ssl false && \
    npm config set registry http://registry.npmjs.org/ && \
    npm install --omit=dev

COPY . .

# Create mount point for SMB share
RUN mkdir -p /mnt/edifiles

# Copy and set permissions for startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Run as root to allow CIFS mounting
USER root

# Expose port
EXPOSE 5000

# Start using the startup script
CMD ["/app/start.sh"]