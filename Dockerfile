FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch

COPY prisma ./prisma
COPY swagger.yaml tsconfig.json ./
COPY src ./src

RUN pnpm install --offline
RUN npx prisma generate
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/swagger.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/assets ./src/assets
EXPOSE 4321
CMD ["node", "dist/src/index.js"]
