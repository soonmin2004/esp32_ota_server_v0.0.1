# Syntax: Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (leverage docker cache)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY src ./src
COPY firmware ./firmware
# Create logs directory inside container (logs bind-mounted at runtime).
RUN mkdir -p ./logs
# .env is optional; copy if present.
COPY .env .env

EXPOSE 3000

# Default env (override via .env or docker run -e)
ENV NODE_ENV=production

CMD ["npm", "start"]
