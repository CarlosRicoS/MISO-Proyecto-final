# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a multi-microservice platform deployed on AWS ECS (EC2-backed) behind an API Gateway. Services are independently containerized and communicate internally via service URLs stored in AWS SSM Parameter Store.

**Services:**
- `services/pms/` — Python/FastAPI. Acts as a proxy/delay layer that forwards property lock requests to poc-properties. Simulates real-world PMS latency.
- `services/poc_properties/` — Java 25 / Spring Boot 4. The core properties microservice with CQRS pattern (Commands/Queries), JPA/PostgreSQL, Prometheus metrics, and Logstash JSON logging.
- `services/PricingEngine/` — .NET 8 / ASP.NET Core. Pricing service backed by PostgreSQL via Entity Framework Core (Npgsql).
- `services/PricingOrchestator/` — .NET 8 / ASP.NET Core. Orchestrates pricing operations across the platform.
- `services/booking/` — Python/FastAPI with hexagonal (ports & adapters) architecture. Manages booking lifecycle (PENDING → APPROVED → CONFIRMED → COMPLETED/CANCELED/REJECTED). PostgreSQL-backed with async SQLAlchemy. Admin actions: approve, confirm, reject (from PENDING or CONFIRMED). Delete endpoint for saga compensation.
- `services/booking_orchestrator/` — Python/FastAPI hexagonal. Synchronous saga coordinator for the booking lifecycle: create reservation, admin approve/confirm/reject, cancel, change dates, and make payment. Creates a booking in `booking`, locks the property in `poc_properties`, and publishes domain events onto the notifications SQS queue. On lock failure, deletes the booking (not cancel) so the user doesn't see spurious cancelled reservations. Requires JWT (forwards `X-User-Id`). No database.
- `services/notifications/` — Python/FastAPI hexagonal. Background SQS consumer for `notifications_queue` that sends transactional emails via the AWS SES SMTP relay. Not called by the frontend, no auth, no database.
- `services/auth/` — Python/FastAPI + boto3. Authentication microservice for user registration via AWS Cognito. Public endpoint (no JWT required).

**Frontend:**
- `user_interface/` — Angular 20 + Ionic 8 + Capacitor. Cross-platform SPA for web and Android (via Capacitor). Implements hotel discovery, search with filtering, and property details flows. TypeScript 5.9, lazy-loaded routing. E2E testing via Playwright (web) and Espresso (Android).

**Infrastructure (Terraform):**
- `terraform/modules/` — Reusable modules: `vpc`, `ecs`, `ecs_service`, `ecr`, `rds`, `api_gateway`, `cognito`, `iam`, `monitoring`, `sqs`.
- `terraform/stacks/` — Composable top-level stacks: `ecs_cluster`, `container_registry`, `database`, `cognito`, `messaging`, `ecs_api`, `api_gateway`, `monitoring`, `web_app`, `web_app_portal_hoteles` (symlink to `web_app`).
- `terraform/environments/develop/` — Per-stack `terraform.tfvars` and `backend.tfvars` for the develop environment.

**Load Tests:** `load-tests/` — JMeter test plan (`PropertySearchLoadTest.jmx`) with shell scripts.

## Commands

### Python Service (pms) — uses `uv`

```bash
cd services/pms
uv sync --group dev          # Install dependencies including dev
uv run pytest tests/ -v      # Run all tests
uv run pytest tests/test_main.py::test_name -v  # Run a single test
uv run uvicorn main:app --reload --port 80       # Run locally
```

Or via Makefile from repo root:
```bash
make unittest-uv DIR=services/pms
```

### Booking Service — uses `uv`

```bash
cd services/booking
uv sync --group dev          # Install dependencies including dev
uv run pytest tests/ -v      # Run all tests
uv run uvicorn main:app --reload --port 8000  # Run locally (requires PostgreSQL)
```

Or via Makefile from repo root:
```bash
make unittest-uv DIR=services/booking
```

**Booking Service API:**
- `POST /api/booking/` — Create a new booking (JWT required, `X-User-Id` injected by API Gateway)
- `GET /api/booking/` — List all bookings for authenticated user
- `GET /api/booking/{booking_id}` — Retrieve a single booking
- `POST /api/booking/{booking_id}/cancel` — Cancel an existing booking
- `DELETE /api/booking/{booking_id}` — Delete a PENDING booking (saga compensation)
- `POST /api/booking/{booking_id}/admin-approve` — Approve a PENDING booking
- `POST /api/booking/{booking_id}/admin-confirm` — Confirm a PENDING booking (approve + confirm in one step)
- `POST /api/booking/{booking_id}/admin-reject` — Reject a PENDING or CONFIRMED booking
- `PATCH /api/booking/{booking_id}/dates` — Change dates of a CONFIRMED booking
- `POST /api/booking/{booking_id}/update-payment-state` — Confirm with payment reference
- Status state machine: `PENDING` → `APPROVED` → `CONFIRMED` → `COMPLETED` (or `CANCELED`/`REJECTED` — see transitions below)
  - `PENDING` → `APPROVED`, `CONFIRMED`, `CANCELED`, `REJECTED`
  - `APPROVED` → `CONFIRMED`, `CANCELED`
  - `CONFIRMED` → `COMPLETED`, `CANCELED`, `REJECTED`
  - `COMPLETED`, `CANCELED`, `REJECTED` — terminal states

### Auth Service — uses `uv`

```bash
cd services/auth
uv sync --group dev          # Install dependencies including dev
uv run pytest tests/ -v      # Run all tests
uv run uvicorn main:app --reload --port 80  # Run locally
```

### Java Service (poc_properties) — uses Maven

```bash
cd services/poc_properties
./mvnw test               # Run tests
./mvnw spring-boot:run    # Run locally (requires PostgreSQL)
./mvnw package -DskipTests  # Build JAR
```

### .NET Service (PricingEngine) — uses dotnet CLI

```bash
cd services/PricingEngine
dotnet test PricingEngineTests/    # Run tests
dotnet run --project PricingEngine/  # Run locally
dotnet build                         # Build
```

### .NET Service (PricingOrchestator) — uses dotnet CLI

```bash
cd services/PricingOrchestator
dotnet test PricingOrchestatorTests/  # Run tests
dotnet run --project PricingOrchestator/  # Run locally
dotnet build                            # Build
```

### Frontend (user_interface) — uses Node.js + npm

```bash
cd user_interface
npm install                    # Install dependencies
npm run build                  # Build for production
npm start                      # Run dev server (http://localhost:4200)
npm run e2e:web               # Run Playwright E2E tests (web)
npm run e2e:android           # Build Android app + run Espresso tests (requires Android SDK)
npm run lint                  # Run ESLint
```

**Frontend Stack:**
- Angular 20 with lazy-loaded routing
- Ionic 8 for mobile-first UI components
- Capacitor 8 for native Android builds
- TypeScript 5.9
- Playwright for web E2E testing
- Espresso for Android E2E testing

**Key Pages:**
- `/home` — Property discovery and featured listings
- `/search-results` — Search with filtering (city, guests, check-in/check-out dates)
- `/propertydetail` — Full property details, booking initiation

### Terraform — via Makefile

```bash
make tf-init STACK=ecs_cluster ENV=develop
make tf-plan STACK=ecs_cluster ENV=develop
make tf-apply STACK=ecs_cluster ENV=develop
make tf-all STACK=ecs_cluster ENV=develop   # init + validate + plan + apply
```

Available stacks: `ecs_cluster`, `container_registry`, `database`, `cognito`, `messaging`, `ecs_api`, `api_gateway`, `monitoring`, `web_app`, `web_app_portal_hoteles`.

### Docker / ECR

```bash
make docker-build SERVICE=pms
make docker-push SERVICE=pms        # Requires ECR login
make docker-deploy SERVICE=pms      # Login + build + push
make ecr-login                      # Authenticate Docker with ECR
```

## Adding a New Backend Service

1. Create `services/<name>/` with app code and a `Dockerfile` exposing port 80 (or specify `container_port` in tfvars).
2. Add ECR repo in `terraform/environments/develop/container_registry/terraform.tfvars`.
3. Add service entry in `terraform/environments/develop/ecs_api/terraform.tfvars` (set `create_database = true` if needed — this auto-creates a PostgreSQL DB and SSM parameters at `/{project_name}/{service_name}/db_*`).
4. Add to `service_names` in `terraform/environments/develop/api_gateway/terraform.tfvars`.
5. Add to the `matrix` in `.github/workflows/deploy_apps.yml`:
   - If Python: add to both `test` (with `language: python`) and `build_and_push` (with `language: python`) jobs
   - If Java/dotnet: add only to `build_and_push` with appropriate `language`

## Deploying the Frontends

The `user_interface/` monorepo contains two Angular projects, each deployed independently:

### TravelHub (`web_app` stack)
1. **Docker build:** `Dockerfile` builds the default `app` project, containerized with Node.js and Nginx
2. **ECR push:** Published as `web_travelhub` to ECR
3. **Terraform stack:** `terraform/stacks/web_app/` deploys to standalone EC2 instance with Docker + Nginx
4. **Accessible via:** API Gateway custom domain or direct EC2 IP

### Portal Hoteles (`web_app_portal_hoteles` stack)
1. **Docker build:** `Dockerfile.portal-hoteles` builds the `portal-hoteles` project
2. **ECR push:** Published as `web_portal_hoteles` to ECR
3. **Terraform stack:** `terraform/stacks/web_app_portal_hoteles/` (symlink to `web_app/`) with separate tfvars (`app_name = "web-app-portal-hoteles"`)
4. **Accessible via:** Direct EC2 IP (separate instance from travelhub)

## CI/CD

### Workflows

- **PR Validation** (`pr_validation.yml`): Runs tests, builds Docker image, and runs `terraform plan` on all stacks for any PR targeting `main`.
- **Deploy Applications** (`deploy_apps.yml`): Manual workflow (workflow_dispatch) — runs tests for Python services, provisions infra stacks (ecs_cluster, container_registry, cognito, database), builds and pushes all service Docker images to ECR, deploys ECS services, and updates API Gateway.
  - Test matrix: `pms`, `auth`, `booking`, `booking-orchestrator`, `notifications` (Python services)
  - Build & Push matrix: `hello_world`, `pms`, `auth`, `booking`, `booking_orchestrator`, `notifications` (Python), `poc_properties` (Java), `pricing_engine`, `pricing_orchestator` (.NET), `travelhub` (Node.js/Angular frontend)
- **Deploy Stack** (`deploy_stack.yml`): Manual workflow for deploying individual Terraform stacks.
- **Seed Database** (`seed_database.yml`): Populates initial test data into RDS.
- **Setup S3 TFstate Bucket** (`setup_s3_tfstate_bucket.yml`): One-time infrastructure setup for Terraform remote state.
- **Destroy Infrastructure** (`destroy_infra.yml`): Tears down all AWS resources (for cleanup/cost control).

### Deployment Requirements

- GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- For PRs: `AWS_SESSION_TOKEN` (temporary credentials)
- Target environment selectable in workflow UI (currently: `develop`)

## Authentication & Authorization (AWS Cognito)

The platform uses **AWS Cognito** for user authentication. The `cognito` Terraform stack creates the User Pool, App Client, and user groups. The `auth` microservice handles registration.

**Cognito Resources (SSM Parameters):**
- `/{project}/cognito/user_pool_id` — Cognito User Pool ID
- `/{project}/cognito/app_client_id` — SPA App Client ID (no secret, public client)
- `/{project}/cognito/user_pool_arn` — Used by API Gateway JWT authorizer
- `/{project}/cognito/issuer_url` — JWT issuer URL for token validation

**User Roles (Cognito Groups):**
- `travelers` — Registered travelers (precedence 2)
- `hotel-admins` — Hotel administrators (precedence 1)

**API Gateway JWT Authorization:**
- HTTP API (apigatewayv2) with a JWT authorizer pointing to Cognito
- Protected routes require `Authorization: Bearer <IdToken>` header
- The API Gateway injects `X-User-Id` (from `sub` claim) and `X-User-Email` (from `email` claim) as headers to backend services
- The `auth` service routes are public (`authorization_type = NONE`) — all other services require JWT
- Public services are configured in `terraform/environments/develop/api_gateway/terraform.tfvars` via `public_services`

**Auth Service Endpoints:**
- `POST /api/auth/register` — Register a new user (public, no token needed). Users are auto-confirmed (no email verification).
  - Body: `{ full_name, email, password, role }` where role is `travelers` or `hotel-admins`
  - Password policy: min 8 chars, uppercase, lowercase, number required
- `POST /api/auth/login` — Authenticate with email/password, returns JWT tokens (public, no token needed)
  - Body: `{ email, password }`
  - Returns: `{ id_token, access_token, refresh_token, expires_in, token_type }`
  - All authentication errors return generic 401 "Invalid credentials" (no email existence leakage)
- `GET /api/auth/me` — Validate access token and return user info including role (public route, token in Authorization header)
  - Header: `Authorization: Bearer <access_token>`
  - Returns: `{ user_id, email, email_verified, role }`
- `GET /api/health` — Health check

**Networking Constraint:**
- ECS tasks on EC2 with `awsvpc` networking do NOT get public IPs (even on public subnets with `map_public_ip_on_launch`)
- The auth service needs to call Cognito APIs, so a **VPC Interface Endpoint** for `cognito-idp` is created in the `ecs_api` stack
- The VPC endpoint filters subnets to only AZs supported by the cognito-idp service (not all AZs support it)
- The Cognito User Pool must NOT have a domain configured (Managed Login blocks PrivateLink access)

**Deployment Order:**
- `cognito` stack deploys in parallel with `ecs_cluster` and `container_registry` (after tests)
- `ecs_api` depends on `cognito` (auth service needs Cognito SSM params)
- `api_gateway` depends on both `ecs_api` and `cognito` (needs JWT authorizer config)

## Service Communication

- `booking-orchestrator` is the synchronous entry point for the booking lifecycle. It forwards the gateway-injected `X-User-Id` header when calling `booking`, converts ISO dates to `dd/MM/yyyy` when calling `poc_properties /api/property/lock`, and publishes versioned domain events (`BOOKING_CREATED`, `BOOKING_APPROVED`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `BOOKING_DATES_CHANGED`, `PAYMENT_CONFIRMED`) onto `notifications_queue` (best-effort). Create reservation saga: creates booking first, then locks; on lock failure it **deletes** the booking (not cancel) and returns 409 `property_unavailable`. Admin reject accepts both PENDING and CONFIRMED bookings.
- `notifications` subscribes to `notifications_queue` via a lifespan-managed async SQS long-polling task and sends emails via `smtplib` against the AWS SES SMTP relay. Unknown schema versions or handler failures are *not* acked — SQS redrives them to `notifications_dlq` automatically.
- `pms` gets the `poc-properties` service URL from SSM: `/final-project-miso/poc-properties/service_url` (injected as `PROPERTIES_SERVICE_URL` env var).
- `poc-properties` reads DB credentials from SSM: `/final-project-miso/poc-properties/db_{host,name,username,password}`.
- `booking` reads DB credentials from SSM: `/final-project-miso/booking/db_{host,name,username,password}`.
- `auth` gets Cognito config from SSM: `/final-project-miso/cognito/{user_pool_id,app_client_id}` (injected as `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` env vars).
- `user_interface` (frontend) gets API Gateway URL from `/assets/config.json` loaded at runtime.
- Services communicate internally within the VPC; the API Gateway (`172.16.0.0/16`) fronts external traffic.
- All backend services receive `X-User-Id` and `X-User-Email` headers from API Gateway JWT authorizer (except public routes).

## poc_properties Architecture

Uses a CQRS pattern with explicit `Command`/`Query` interfaces and handlers. Key packages under `co.edu.uniandes.grupo03.proyectofinal.pocproperties`:
- `business/command/` — write operations (e.g., `LockPropertyCommand`)
- `business/query/` — read operations (e.g., `SearchPropertiesQuery`)
- `business/mapper/` — MapStruct mappers
- `business/exception/` — domain exceptions
- `infrastructure/persistence/` — JPA entities and repositories

## Booking Service Architecture

Follows **hexagonal (ports & adapters)** architecture with strict layer boundaries enforced by tests:
- `domain/` — Core business rules (booking aggregate, status state machine, value objects). No external dependencies.
- `application/` — Use cases (commands/queries: CreateBooking, CancelBooking, DeleteBooking, GetBooking, ChangeDates, AdminApprove, AdminConfirm, AdminReject, UpdatePaymentState). Depends only on domain.
- `infrastructure/` — Persistence adapters (SQLAlchemy async ORM, in-memory repository for testing).
- `controllers.py` — FastAPI HTTP adapter.
- **State Machine:** Bookings transition through strict states; invalid transitions raise domain exceptions.
- **Database:** PostgreSQL via async SQLAlchemy (connection pooling configurable via `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, etc.).
- **Testing:** Unit tests use in-memory repository; integration tests hit real PostgreSQL.
