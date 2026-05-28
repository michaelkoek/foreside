FROM node:20-alpine AS builder

RUN apk add --no-cache protobuf

WORKDIR /app/gateway

COPY gateway/package*.json ./
RUN npm ci

COPY proto/ /app/proto/
COPY gateway/tsconfig.json ./
COPY gateway/src/ ./src/

RUN npm run generate && npm run build

# ---

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY gateway/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/gateway/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
