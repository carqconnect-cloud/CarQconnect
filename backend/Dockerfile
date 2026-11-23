# --- build stage -----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# --- runtime stage ---------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev && npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 4000
USER node
# Run migrations at deploy time, not here: `npx prisma migrate deploy`
CMD ["node", "--max-old-space-size=384", "dist/server.js"]
