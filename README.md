# Foreside Beer Case

A beer ordering API built with microservices and gRPC — the way a real bar would work if it ran on AWS.

---

## What it does

You send a request to order some beers. The system simulates the bartender preparing and pouring each one — concurrently. As each beer finishes, you get notified immediately. When the last one is ready, the order is complete.

The key behaviour: if you order a Pilsner (fast) and a Guinness (slow), the Pilsner signals ready first. You don't wait for the slowest beer before hearing about the fastest one.

---

## How it's built

Three services, each with a single responsibility:

**BeerService** knows about beers. It holds a list of 12 beers, each with a unique preparation time, glass volume, and pour time. It answers one question: "what beers do you have, and what are their details?"

**OrderService** handles orders. When an order comes in, it asks BeerService for the beer details, then simulates all beers being poured at the same time. As each beer finishes (prep time + pour time), it immediately sends back a "beer ready" event. When all are done, it sends a final "order complete" event. This uses gRPC server-side streaming — the connection stays open and results flow back as they happen, not all at once at the end.

**API Gateway** is the only thing Postman talks to. It receives normal HTTP/JSON requests, validates them, translates them into gRPC calls to the microservices, and streams the results back. It contains no business logic — it's purely a translator and traffic router.

```
Postman  →  API Gateway  →  OrderService  →  BeerService
              (REST/JSON)      (gRPC)           (gRPC)
```

The microservices are on a private internal network. Only the gateway is reachable from outside.

---

## Tech choices

**Node.js + TypeScript** throughout. One language across all three services means consistent tooling, shared patterns, and no context switching. TypeScript's strict typing pairs well with gRPC's strongly-typed contracts.

**Fastify** for the API Gateway instead of Express. It has built-in JSON schema validation (so malformed requests are rejected before they ever reach a microservice), structured logging out of the box, and better performance.

**@grpc/grpc-js + ts-proto** for gRPC. ts-proto generates clean, async/await-compatible TypeScript interfaces directly from the `.proto` files. Both the client and server types come from the same generated code, so a contract mismatch between services is a compile-time error, not a runtime surprise.

**Pino** for logging. Every request gets a correlation ID at the gateway that flows through every downstream gRPC call. This means you can trace a single order across all three services by filtering on one ID.

**Docker + Docker Compose** for local development. One command (`docker compose up`) starts the entire system.

**Terraform + AWS** for cloud deployment. ECS Fargate runs the containers (no servers to manage), ECR stores the images, and the VPC keeps the microservices isolated from the public internet. Secrets live in SSM Parameter Store — nothing sensitive in environment variables or committed to the repo.

---

## Project structure

```
foreside-beer-case/
├── proto/              # The contracts — defines every message and RPC call
│   ├── beer.proto
│   └── order.proto
├── beer-service/       # gRPC server — owns the beer data
├── order-service/      # gRPC server — handles orders, streams results
├── gateway/            # Fastify REST API — the public entry point
├── terraform/          # Everything needed to deploy this to AWS
├── docker-compose.yml  # Run the full system locally with one command
└── postman/            # Ready-to-import Postman collection
```

---

## Running locally

### Prerequisites

Make sure you have the following installed:

- Node.js 20+
- Docker + Docker Compose
- protobuf compiler: `brew install protobuf`

### Setup

```bash
# Install dependencies for each service
cd beer-service && npm install && cd ..
cd order-service && npm install && cd ..
cd gateway && npm install && cd ..

# Generate TypeScript types from the proto files
cd beer-service && npm run generate && cd ..
cd order-service && npm run generate && cd ..
cd gateway && npm run generate && cd ..
```

### Start everything

```bash
docker compose up --build
```

The gateway will be available at `http://localhost:3000`. The microservices run on the internal Docker network and are not directly accessible.

---

## API

### GET /beers

Returns the full beer menu.

```json
{
  "beers": [
    {
      "id": 1,
      "name": "Pilsner Urquell",
      "bartender_preparation_time": 1,
      "volume": 300,
      "pour_time": 4
    }
  ]
}
```

### POST /order

Place an order. Specify which beers and how many of each.

```json
{
  "items": [
    { "beer_id": 2, "quantity": 2 },
    { "beer_id": 8, "quantity": 1 }
  ]
}
```

The response streams back as beers finish pouring (newline-delimited JSON):

```json
{ "event": "beer_ready", "beer_id": 2, "beer_name": "Heineken", "quantity": 2 }
{ "event": "beer_ready", "beer_id": 8, "beer_name": "Guinness", "quantity": 1 }
{ "event": "order_complete", "order_id": "abc-123", "total_beers": 3 }
```

---

## Deploying to AWS

You'll need the AWS CLI configured and Terraform installed (`brew install terraform`).

```bash
cd terraform
terraform init
terraform plan   # preview what gets created
terraform apply  # deploy
```

This provisions a VPC, ECS Fargate cluster, ECR image repositories, an Application Load Balancer, and the IAM roles and security groups that keep everything locked down.

When you're done evaluating, tear it all down with:

```bash
terraform destroy
```

Expected cost on AWS Free Tier for the duration of this assessment: **$0**.

---

## The beer menu

12 beers, each with a unique preparation time, glass volume, and pour time — so concurrent ordering always produces a meaningful, observable result.

| Beer | Prep | Volume | Pour |
|---|---|---|---|
| Hoegaarden | 9s | 250ml | 3s |
| Pilsner Urquell | 1s | 300ml | 4s |
| Heineken | 2s | 330ml | 5s |
| Corona Extra | 3s | 355ml | 6s |
| Stella Artois | 4s | 400ml | 7s |
| IPA Hoppinator | 5s | 440ml | 8s |
| Bud Light | 6s | 473ml | 9s |
| Weizen | 7s | 500ml | 10s |
| Leffe Blonde | 10s | 600ml | 11s |
| Tripel Karmeliet | 11s | 650ml | 12s |
| Guinness | 8s | 568ml | 13s |
| La Chouffe | 12s | 750ml | 14s |
