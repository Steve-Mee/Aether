# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Ensure OpenSSL runtime is available for Prisma engines.
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 9000

# Regenerate Prisma client at runtime so bind-mounted node_modules stays compatible.
CMD ["sh", "-c", "npx prisma generate && npm run dev"]