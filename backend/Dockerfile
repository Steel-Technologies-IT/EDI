
# --- Build backend ---
FROM node:20


WORKDIR /app

COPY package*.json ./

RUN npm config set strict-ssl false && \
    npm config set registry http://registry.npmjs.org/ && \
    npm install --omit=dev

COPY . .



# Expose port
EXPOSE 5000

# Start Node.js directly
CMD ["node", "server.js"]