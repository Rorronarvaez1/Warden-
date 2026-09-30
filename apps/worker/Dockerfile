# Construir desde la raíz del repo:  docker build -f apps/worker/Dockerfile .
FROM node:24-slim
RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile --filter "@warden/worker..."

ENV NODE_ENV=production
USER node
CMD ["pnpm", "--filter", "@warden/worker", "start"]
