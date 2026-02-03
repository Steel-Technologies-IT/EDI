
# --- Build backend ---
FROM node:20


WORKDIR /app

COPY package*.json ./

RUN npm config set strict-ssl false && \
    npm config set registry https://registry.npmjs.org/ && \
    npm install --omit=dev
# Install OpenJDK so the container can run the Java helper (AS400Query)
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless netcat-openbsd && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
COPY . .

# Compile Java helper classes (if any) so AS400Query is available at runtime.
# Compilation is best-effort: if there are no .java files this will harmlessly continue.
RUN if ls /app/as400/*.java 1> /dev/null 2>&1; then \
            javac -cp "/app/as400/java/jt400.jar" /app/as400/*.java -d /app/as400 || true; \
        fi



# Expose port
EXPOSE 5000

# Start Node.js directly
CMD ["node", "server.js"]