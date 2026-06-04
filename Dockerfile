# Stage 1: Install backend dependencies
FROM node:20-alpine AS backend-deps
WORKDIR /app
COPY package.json ./
RUN npm install --production

# Stage 2: Build webui
FROM node:20-alpine AS webui-builder
WORKDIR /app
COPY package.json ./
COPY webui/ webui/
RUN cd webui && npm install && npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy backend dependencies
COPY --from=backend-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Copy built webui
COPY --from=webui-builder /app/webui/dist ./webui/dist

# Create data directory for file mode
RUN mkdir -p /app/data /app/logs

EXPOSE 3000

CMD ["node", "src/start.js"]