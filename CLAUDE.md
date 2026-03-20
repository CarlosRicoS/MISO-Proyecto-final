# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a multi-microservice platform deployed on AWS ECS (EC2-backed) behind an API Gateway. Services are independently containerized and communicate internally via service URLs stored in AWS SSM Parameter Store.

**Services:**
- `services/pms/` — Python/FastAPI. Acts as a proxy/delay layer that forwards property lock requests to poc-properties. Simulates real-world PMS latency.
- `services/poc_properties/` — Java 25 / Spring Boot 4. The core properties microservice with CQRS pattern (Commands/Queries), JPA/PostgreSQL, Prometheus metrics, and Logstash JSON logging.
- `services/PricingEngine/` — .NET 8 / ASP.NET Core. Pricing service backed by PostgreSQL via Entity Framework Core (Npgsql).

**Infrastructure (Terraform):**
- `terraform/modules/` — Reusable modules: `vpc`, `ecs`, `ecs_service`, `ecr`, `rds`, `api_gateway`, `iam`, `monitoring`.
- `terraform/stacks/` — Composable top-level stacks: `ecs_cluster`, `container_registry`, `database`, `ecs_api`, `api_gateway`, `monitoring`.
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

Available stacks: `ecs_cluster`, `container_registry`, `database`, `ecs_api`, `api_gateway`, `monitoring`.

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

## Service Communication

- `pms` gets the `poc-properties` service URL from SSM: `/final-project-miso/poc-properties/service_url` (injected as `PROPERTIES_SERVICE_URL` env var).
- `poc-properties` reads DB credentials from SSM: `/final-project-miso/poc-properties/db_{host,name,username,password}`.
- Services communicate internally within the VPC; the API Gateway (`172.16.0.0/16`) fronts external traffic.

## poc_properties Architecture

Uses a CQRS pattern with explicit `Command`/`Query` interfaces and handlers. Key packages under `co.edu.uniandes.grupo03.proyectofinal.pocproperties`:
- `business/command/` — write operations (e.g., `LockPropertyCommand`)
- `business/query/` — read operations (e.g., `SearchPropertiesQuery`)
- `business/mapper/` — MapStruct mappers
- `business/exception/` — domain exceptions
- `infrastructure/persistence/` — JPA entities and repositories
