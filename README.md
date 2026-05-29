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
┌─────────────────────────────────────────────────────────────────┐
│                         Your machine                            │
│                                                                 │
│   Postman / curl                                                │
│       │                                                         │
│       │  POST /order  { items: [{ beer_id: 1 }, { beer_id: 8}] }│
│       ▼                                                         │
│  ┌─────────────┐                                                │
│  │ API Gateway │  :3000  (only service exposed to the world)    │
│  │  (Fastify)  │                                                │
│  └──────┬──────┘                                                │
│         │  gRPC PlaceOrder(items)          internal network     │
│         ▼                                                       │
│  ┌──────────────┐   gRPC GetBeersByIds   ┌─────────────┐        │
│  │ OrderService │ ──────────────────────▶│ BeerService │        │
│  │              │ ◀──────────────────────│             │        │
│  │   :50052     │   [beer details]       │   :50051    │        │
│  └──────┬───────┘                        └─────────────┘        │
│         │                                                       │
│         │  pours all beers simultaneously                       │
│         │                                                       │
│         │  t=5s  ──▶ stream: beer_ready { Pilsner Urquell }     │
│         │  t=21s ──▶ stream: beer_ready { Guinness }            │
│         │  t=21s ──▶ stream: order_complete { total_beers: 2 }  │
│         ▼                                                       │
│  API Gateway streams each event back to Postman as it arrives   │
│  (newline-delimited JSON — one line per event)                  │
└─────────────────────────────────────────────────────────────────┘
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

The gateway will be available at `http://localhost:3000`.

If you're using **Orbstack**, each container gets a named URL automatically. Use `http://gateway.foreside-beer-case.orb.local` instead — this avoids port conflicts with other local services.

The microservices run on the internal Docker network and are not directly accessible.

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

## AWS Architecture

```
Internet
    │  HTTP :80
    ▼
┌───────────────────────────────────────────────┐
│  AWS (eu-west-1)                              │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  VPC  10.0.0.0/16                       │  │
│  │                                         │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │  Public Subnets (AZ a + b)       │   │  │
│  │  │                                  │   │  │
│  │  │  ┌─────┐   :3000  ┌─────────┐   │   │  │
│  │  │  │ ALB │ ────────▶│ Gateway │   │   │  │
│  │  │  └─────┘          │  (ECS)  │   │   │  │
│  │  │                   └────┬────┘   │   │  │
│  │  │                        │ gRPC   │   │  │
│  │  │           ┌────────────┼──────┐ │   │  │
│  │  │           ▼            ▼      │ │   │  │
│  │  │     ┌──────────┐  ┌─────────┐ │ │   │  │
│  │  │     │  Order   │  │  Beer   │ │ │   │  │
│  │  │     │ Service  │  │ Service │ │ │   │  │
│  │  │     │  (ECS)   │  │  (ECS)  │ │ │   │  │
│  │  │     └──────────┘  └─────────┘ │ │   │  │
│  │  │     :50052              :50051 │ │   │  │
│  │  │     └──────────────────────── ┘ │   │  │
│  │  │     service discovery: foreside.local   │  │
│  │  └──────────────────────────────────┘   │  │
│  │                                         │  │
│  │  ECR (image registry)  CloudWatch (logs)│  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

## Infrastructure (Terraform)

All AWS infrastructure is defined in the `terraform/` directory. The configuration provisions:

- **VPC** with two public subnets across two availability zones
- **ECR** repositories for each service image
- **ECS Fargate** cluster with one task per service
- **Application Load Balancer** routing port 80 to the gateway
- **AWS Cloud Map** for private DNS-based service discovery (`beer-service.foreside.local`)
- **Security groups** — only the gateway is reachable from the internet; microservices accept traffic from the gateway only
- **IAM roles** with least-privilege per service
- **CloudWatch** log groups with 7-day retention

A full plan showing all 44 resources is committed at `terraform/plan.out`. To deploy against a real AWS account:

```bash
cd terraform
terraform init
terraform apply
```

Tear down when done:

```bash
terraform destroy
```

---

## Testing with Postman

Import both files from the `postman/` directory into Postman:

1. `foreside-beer-case.collection.json` — 5 pre-built requests
2. `environment.local.json` — points to the Orbstack local URL
3. `environment.aws.json` — points to the AWS ALB (update `base_url` after `terraform apply`)

Select the active environment from the top-right dropdown before running requests. The collection includes a streaming order request that demonstrates the concurrent pouring behaviour — watch events arrive out of request order as faster beers finish first.

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
