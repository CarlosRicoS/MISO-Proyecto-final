# MISO Project - Final Project (TravelHub)

This repository contains the source code and infrastructure-as-code (Terraform) for the MISO Final Project. The architecture consists of multiple microservices deployed on AWS ECS (EC2-backed), fronted by an API Gateway with JWT-based authentication via AWS Cognito.

## Project Structure

```
services/
  auth/               Python/FastAPI — User registration via AWS Cognito
  pms/                Python/FastAPI — PMS proxy/delay layer for property locks
  poc_properties/     Java 25/Spring Boot 4 — Core properties service (CQRS, PostgreSQL)
  PricingEngine/      .NET 8/ASP.NET Core — Pricing service (PostgreSQL)
terraform/
  modules/            Reusable modules: vpc, ecs, ecs_service, ecr, rds, api_gateway, cognito, iam, monitoring
  stacks/             Composable stacks: ecs_cluster, container_registry, database, cognito, ecs_api, api_gateway, monitoring, web_app
  environments/       Per-stack tfvars and backend config (develop/)
load-tests/           JMeter test plans and runner scripts
.github/workflows/    CI/CD pipelines
```

---

## Services

### Auth (`services/auth/`)
- **Stack:** Python/FastAPI + boto3
- **Purpose:** User registration via AWS Cognito. Public endpoint (no JWT required).
- **Endpoints:**
  - `POST /api/auth/register` — Register a new user
  - `GET /api/health` — Health check
- **Details:** See [`services/auth/README.md`](services/auth/README.md) for request/response examples, password policy, and roles.

### PMS (`services/pms/`)
- **Stack:** Python/FastAPI
- **Purpose:** Acts as a proxy/delay layer that forwards property lock requests to poc-properties. Simulates real-world PMS latency.
- Gets the poc-properties URL from SSM: `/final-project-miso/poc-properties/service_url`

### Properties (`services/poc_properties/`)
- **Stack:** Java 25 / Spring Boot 4
- **Purpose:** Core properties microservice with CQRS pattern, JPA/PostgreSQL, Prometheus metrics, and Logstash JSON logging.

### Pricing Engine (`services/PricingEngine/`)
- **Stack:** .NET 8 / ASP.NET Core
- **Purpose:** Pricing service backed by PostgreSQL via Entity Framework Core (Npgsql).

---

## Authentication & Authorization

The platform uses **AWS Cognito** for user authentication.

### Architecture

1. **Cognito User Pool** — Managed by Terraform (`terraform/stacks/cognito/`). Creates the User Pool, App Client (public, no secret), and two user groups.
2. **Auth Microservice** — `POST /api/auth/register` creates users in Cognito and assigns them to a group.
3. **API Gateway JWT Authorizer** — HTTP API (apigatewayv2) validates JWT tokens and injects user identity headers to backend services.

### User Roles (Cognito Groups)

| Role           | Description                                          | Precedence |
|----------------|------------------------------------------------------|------------|
| `travelers`    | Registered travelers searching and booking properties | 2          |
| `hotel-admins` | Hotel administrators managing property listings       | 1          |

### Authentication Flow

1. **Register** — `POST /api/auth/register` with `{ full_name, email, password, role }`
2. **Confirm email** — Cognito sends a verification code to the user's email
3. **Sign in** — Use Cognito's `InitiateAuth` API with `USER_PASSWORD_AUTH` flow to obtain `IdToken`, `AccessToken`, and `RefreshToken`
4. **Authorize requests** — Send `Authorization: Bearer <IdToken>` on all subsequent API calls

### JWT Header Injection

Protected endpoints (all services except `/auth/*`) require a valid JWT. The API Gateway validates the token and injects these headers to backend services:

| Header         | Source                    | Description          |
|----------------|---------------------------|----------------------|
| `X-User-Id`    | `sub` claim from JWT      | Cognito user UUID    |
| `X-User-Email` | `email` claim from JWT    | User's email address |

> **Note:** The `cognito:groups` claim cannot be mapped as a header (the colon breaks HTTP API mapping expressions). Backends that need group info should decode the JWT directly.

### Cognito SSM Parameters

| Parameter                                      | Description           |
|------------------------------------------------|-----------------------|
| `/final-project-miso/cognito/user_pool_id`     | Cognito User Pool ID  |
| `/final-project-miso/cognito/app_client_id`    | SPA App Client ID     |
| `/final-project-miso/cognito/user_pool_arn`    | Used by JWT authorizer|
| `/final-project-miso/cognito/issuer_url`       | JWT issuer URL        |

---

## How to Add a New Service

### 1. Develop the Service
1. Create a directory under `services/` (e.g., `services/my-service/`).
2. Add application code with a `Dockerfile` exposing port 80 (or specify `container_port` in tfvars).
3. Add tests.

### 2. Define Infrastructure

Update three files in `terraform/environments/develop/`:

**A. Container Registry** — `container_registry/terraform.tfvars`: add ECR repo name to `repository_names`.

**B. ECS Service** — `ecs_api/terraform.tfvars`: add service entry to the `services` map.
```hcl
"my-service" = {
  ecr_repository_name = "api_my_service"
  container_name      = "api_my_service"
  ecs_task_size       = { cpu = 512, memory = 921 }
  create_database     = true   # Set true if you need a PostgreSQL database
  desired_count_tasks = 1
  autoscaling         = { max_capacity = 2, min_capacity = 1 }
  secrets             = []     # Optional: SSM parameter references injected as env vars
}
```

**C. API Gateway** — `api_gateway/terraform.tfvars`: add service name to `service_names`. If the service should be publicly accessible (no JWT required), also add it to `public_services`.

### 3. Update CI/CD
Add the service to `test` and `build_and_push` matrices in both `.github/workflows/deploy_apps.yml` and `.github/workflows/pr_validation.yml`.

---

## Deployment

### CI/CD Pipelines

- **PR Validation** (`pr_validation.yml`) — Runs on every PR to `main`: tests, Docker build, and `terraform plan` on all stacks.
- **Deploy Applications** (`deploy_apps.yml`) — Manual trigger via GitHub Actions: full deploy pipeline.

### Deployment Pipeline Order

```
test
  ├── deploy_ecs_cluster ──────────────────────────┐
  ├── deploy_container_registry → build_and_push ──┤
  ├── deploy_cognito ──────────────────────────────┼── deploy_ecs_api → deploy_api_gateway → seed_database
  ├── deploy_database ─────────────────────────────┘                                      → deploy_web_app
  └── deploy_monitoring
```

Key dependencies:
- **`ecs_api`** depends on `cognito` (auth service needs Cognito SSM params), `database`, `ecs_cluster`, and `build_and_push`
- **`api_gateway`** depends on `ecs_api` and `cognito` (JWT authorizer needs issuer URL + client ID)
- **`cognito`** deploys in parallel with `ecs_cluster` and `container_registry` (no added pipeline time)

### Triggering a Deploy
1. Go to **Actions** tab in GitHub
2. Select **Deploy Applications** workflow
3. Click **Run workflow** and select the target environment (e.g., `develop`)

### Terraform Commands (via Makefile)

```bash
make tf-init  STACK=ecs_cluster ENV=develop
make tf-plan  STACK=ecs_cluster ENV=develop
make tf-apply STACK=ecs_cluster ENV=develop
make tf-all   STACK=ecs_cluster ENV=develop   # init + validate + plan + apply
```

Available stacks: `ecs_cluster`, `container_registry`, `database`, `cognito`, `ecs_api`, `api_gateway`, `monitoring`, `web_app`.

---

## Database Integration

When `create_database = true` is set for a service, Terraform automatically:
1. Creates a PostgreSQL database named after the service on the shared RDS instance.
2. Creates SSM parameters for connectivity:
   - `/{project_name}/{service_name}/db_host`
   - `/{project_name}/{service_name}/db_name`
   - `/{project_name}/{service_name}/db_username`
   - `/{project_name}/{service_name}/db_password`

These are injected as environment variables into the ECS task via the `secrets` configuration.

---

## Service Communication

| Service    | Reads from SSM                                          | Injected As              |
|------------|---------------------------------------------------------|--------------------------|
| `pms`      | `/final-project-miso/poc-properties/service_url`        | `PROPERTIES_SERVICE_URL` |
| `auth`     | `/final-project-miso/cognito/user_pool_id`              | `COGNITO_USER_POOL_ID`   |
| `auth`     | `/final-project-miso/cognito/app_client_id`             | `COGNITO_CLIENT_ID`      |

Services communicate internally within the VPC. The API Gateway fronts all external traffic.

---

## Local Development

### Python Services (auth, pms)
```bash
cd services/auth  # or services/pms
uv sync --group dev
uv run pytest tests/ -v
uv run uvicorn main:app --reload --port 80
```

### Java Service (poc_properties)
```bash
cd services/poc_properties
./mvnw test
./mvnw spring-boot:run       # Requires PostgreSQL
```

### .NET Service (PricingEngine)
```bash
cd services/PricingEngine
dotnet test PricingEngineTests/
dotnet run --project PricingEngine/
```

### Docker
```bash
make docker-build SERVICE=auth
make docker-push SERVICE=auth         # Requires ECR login
make docker-deploy SERVICE=auth       # Login + build + push
make ecr-login                        # Authenticate Docker with ECR
```

---

## Networking Notes

- ECS tasks use `awsvpc` networking on EC2. Task ENIs do **not** get public IPs, even on public subnets.
- The `auth` service reaches Cognito via a **VPC Interface Endpoint** for `cognito-idp` (created in the `ecs_api` stack).
- The VPC endpoint dynamically filters subnets to AZs that support the `cognito-idp` service (not all AZs do).
- The Cognito User Pool must **not** have a domain configured (Managed Login blocks PrivateLink access).
