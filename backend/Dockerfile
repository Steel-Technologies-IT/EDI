
# --- Build backend ---
FROM node:20


WORKDIR /app

COPY package*.json ./

RUN npm config set strict-ssl false && \
    npm config set registry https://registry.npmjs.org/ && \
    npm install --omit=dev

RUN apt-get update && \
    apt-get install -y --allow-unauthenticated openjdk-17-jdk-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Java home environment variable
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"


# Expose port
EXPOSE 5000

# Ensure start script is executable and use it as container entrypoint
RUN chmod +x /app/start.sh || true

# Use start.sh to allow mounting and healthchecks before launching node
CMD ["/bin/bash", "/app/start.sh"]