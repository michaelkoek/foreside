FROM node:20-alpine AS builder

RUN apk add --no-cache protobuf

WORKDIR /app/beer-service

COPY beer-service/package*.json ./
RUN npm ci

COPY proto/ /app/proto/
COPY beer-service/tsconfig.json ./
COPY beer-service/src/ ./src/

RUN npm run generate && npm run build

# ---

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY beer-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/beer-service/dist ./dist

USER node
EXPOSE 50051
CMD ["node", "dist/server.js"]
