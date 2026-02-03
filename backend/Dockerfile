
# --- Build backend ---
FROM node:20


WORKDIR /app

COPY package*.json ./

RUN npm config set strict-ssl false && \
    npm config set registry https://registry.npmjs.org/ && \
    npm install --omit=dev
# Install OpenJDK so the container can run the Java helper (AS400Query)
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless netcat-openbsd && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
COPY . .



# Expose port
EXPOSE 5000

# Start Node.js directly
CMD ["node", "server.js"]