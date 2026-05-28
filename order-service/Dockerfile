FROM node:20-alpine AS builder

RUN apk add --no-cache protobuf

WORKDIR /app/order-service

COPY order-service/package*.json ./
RUN npm ci

COPY proto/ /app/proto/
COPY order-service/tsconfig.json ./
COPY order-service/src/ ./src/

RUN npm run generate && npm run build

# ---

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY order-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/order-service/dist ./dist

USER node
EXPOSE 50052
CMD ["node", "dist/server.js"]
