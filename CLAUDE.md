# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a multi-microservice platform deployed on AWS ECS (EC2-backed) behind an API Gateway. Services are independently containerized and communicate internally via service URLs stored in AWS SSM Parameter Store.

**Services:**
- `services/pms/` — Python/FastAPI. Acts as a proxy/delay layer that forwards property lock requests to poc-properties. Simulates real-world PMS latency.
- `services/poc_properties/` — Java 25 / Spring Boot 4. The core properties microservice with CQRS pattern (Commands/Queries), JPA/PostgreSQL, Prometheus metrics, and Logstash JSON logging.
- `services/PricingEngine/` — .NET 8 / ASP.NET Core. Pricing service backed by PostgreSQL via Entity Framework Core (Npgsql).
- `services/auth/` — Python/FastAPI + boto3. Authentication microservice for user registration via AWS Cognito. Public endpoint (no JWT required).

**Infrastructure (Terraform):**
- `terraform/modules/` — Reusable modules: `vpc`, `ecs`, `ecs_service`, `ecr`, `rds`, `api_gateway`, `cognito`, `iam`, `monitoring`.
- `terraform/stacks/` — Composable top-level stacks: `ecs_cluster`, `container_registry`, `database`, `cognito`, `ecs_api`, `api_gateway`, `monitoring`.
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

### Terraform — via Makefile

```bash
make tf-init STACK=ecs_cluster ENV=develop
make tf-plan STACK=ecs_cluster ENV=develop
make tf-apply STACK=ecs_cluster ENV=develop
make tf-all STACK=ecs_cluster ENV=develop   # init + validate + plan + apply
```

Available stacks: `ecs_cluster`, `container_registry`, `database`, `cognito`, `ecs_api`, `api_gateway`, `monitoring`, `web_app`.

### Docker / ECR

```bash
make docker-build SERVICE=pms
make docker-push SERVICE=pms        # Requires ECR login
make docker-deploy SERVICE=pms      # Login + build + push
make ecr-login                      # Authenticate Docker with ECR
```

## Adding a New Service

1. Create `services/<name>/` with app code and a `Dockerfile` exposing port 80 (or specify `container_port` in tfvars).
2. Add ECR repo in `terraform/environments/develop/container_registry/terraform.tfvars`.
3. Add service entry in `terraform/environments/develop/ecs_api/terraform.tfvars` (set `create_database = true` if needed — this auto-creates a PostgreSQL DB and SSM parameters at `/{project_name}/{service_name}/db_*`).
4. Add to `service_names` in `terraform/environments/develop/api_gateway/terraform.tfvars`.
5. Add to the `matrix` in `.github/workflows/deploy_apps.yml` for both `test` and `build_and_push` jobs.

## CI/CD

- **PR Validation** (`pr_validation.yml`): Runs tests, builds Docker image, and runs `terraform plan` on all stacks for any PR targeting `main`.
- **Deploy Applications** (`deploy_apps.yml`): Manual workflow (workflow_dispatch) — runs tests, provisions infra, builds and pushes Docker images, deploys ECS services, updates API Gateway.
- Deployment requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and (for PRs) `AWS_SESSION_TOKEN` as GitHub secrets.

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

- `pms` gets the `poc-properties` service URL from SSM: `/final-project-miso/poc-properties/service_url` (injected as `PROPERTIES_SERVICE_URL` env var).
- `poc-properties` reads DB credentials from SSM: `/final-project-miso/poc-properties/db_{host,name,username,password}`.
- `auth` gets Cognito config from SSM: `/final-project-miso/cognito/{user_pool_id,app_client_id}` (injected as `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` env vars).
- Services communicate internally within the VPC; the API Gateway (`172.16.0.0/16`) fronts external traffic.

## poc_properties Architecture

Uses a CQRS pattern with explicit `Command`/`Query` interfaces and handlers. Key packages under `co.edu.uniandes.grupo03.proyectofinal.pocproperties`:
- `business/command/` — write operations (e.g., `LockPropertyCommand`)
- `business/query/` — read operations (e.g., `SearchPropertiesQuery`)
- `business/mapper/` — MapStruct mappers
- `business/exception/` — domain exceptions
- `infrastructure/persistence/` — JPA entities and repositories
