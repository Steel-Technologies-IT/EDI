
# --- Build backend ---
FROM node:20


WORKDIR /app

COPY package*.json ./

RUN npm config set strict-ssl false && \
    npm config set registry https://registry.npmjs.org/ && \
    npm install --omit=dev

# Install OpenJDK (JDK not JRE) so the container can compile and run the Java helper (AS400Query)
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless netcat-openbsd && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

COPY . .

# Compile Java helper classes (if any) so AS400Query is available at runtime.
# Use colon separator on Linux and include all jars (jt400.jar, json.jar)
RUN if ls /app/as400/*.java 1> /dev/null 2>&1; then \
      javac -cp "/app/as400:/app/as400/java/*" /app/as400/*.java -d /app/as400 || true; \
      # package compiled classes into a helper jar for easier classpath management
      (cd /app/as400 && jar cf as400-helper.jar *.class) || true; \
    fi

# Expose port
EXPOSE 5000

# Ensure start script is executable and use it as container entrypoint
RUN chmod +x /app/start.sh || true

# Use start.sh to allow mounting and healthchecks before launching node
CMD ["/bin/bash", "/app/start.sh"]