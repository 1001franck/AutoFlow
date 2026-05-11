FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run db:generate
RUN npm run build

# ---

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
# Copie le dossier prisma pour que migrate deploy puisse trouver les migrations
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Exécute les migrations puis démarre le serveur
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
