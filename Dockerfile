FROM node:22-alpine AS deps
WORKDIR /app
RUN apk upgrade --no-cache
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk upgrade --no-cache
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk upgrade --no-cache
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 8080
ENV PORT=8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
