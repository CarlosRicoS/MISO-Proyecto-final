# MISO Project - Final Project (TravelHub)

This repository contains the source code and infrastructure-as-code (Terraform) for the MISO Final Project. The architecture consists of multiple microservices deployed on AWS ECS (EC2-backed), fronted by an API Gateway with JWT-based authentication via AWS Cognito.

## Project Structure

```
services/
  auth/               Python/FastAPI — User registration and auth via Cognito
  booking/            Python/FastAPI — Reservation management (PostgreSQL)
  pms/                Python/FastAPI — PMS latency simulator (proxy to Properties)
  poc_properties/     Java 25/Spring Boot 4 — Core property service (CQRS, PostgreSQL)
  PricingEngine/      .NET 8/ASP.NET Core — Price calculation (PostgreSQL)
  PricingOrchestator/ .NET 8/ASP.NET Core — Service orchestrator
user_interface/       Angular 19/Ionic — Multi-platform travel application
terraform/
  modules/            Reusable infrastructure components (VPC, ECS, RDS, Cognito, etc.)
  stacks/             Composable stacks for cluster, database, api_gateway, etc.
  environments/       Configuration for develop/ environment
db/seeds/             SQL seed scripts for database initialization
load-tests/           JMeter plans and shell runners
.github/workflows/    CI/CD pipelines for deployment and validation
```

---

## Services

### Auth (`services/auth/`)
- **Stack:** Python/FastAPI + AWS Cognito
- **Purpose:** User authentication, registration, and role management.
- **Key Endpoints:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- **Details:** See [`services/auth/README.md`](services/auth/README.md).

### Booking (`services/booking/`)
- **Stack:** Python/FastAPI + PostgreSQL (SQLAlchemy)
- **Purpose:** Manages property reservations and user booking history.
- **Key Endpoints:** `POST /api/booking/`, `GET /api/booking/{id}`, `POST /api/booking/{id}/cancel`.

### Properties PoC (`services/poc_properties/`)
- **Stack:** Java 25 / Spring Boot 4 + PostgreSQL
- **Purpose:** Core service for property catalog, availability search, and booking locks.
- **Key Endpoints:** `GET /api/property`, `GET /api/property/{id}`, `POST /api/property/lock`.
- **Details:** See [`services/poc_properties/README.md`](services/poc_properties/README.md).

### Pricing Engine (`services/PricingEngine/`)
- **Stack:** .NET 8 / ASP.NET Core + PostgreSQL
- **Purpose:** Calculates dynamic pricing for properties based on guests and dates.
- **Key Endpoints:** `GET /api/PropertyPrice`.

### Pricing Orchestrator (`services/PricingOrchestator/`)
- **Stack:** .NET 8 / ASP.NET Core
- **Purpose:** Orchestrates calls between the Properties and Pricing services to provide a unified view.
- **Key Endpoints:** `GET /api/Property`.

### PMS Proxy (`services/pms/`)
- **Stack:** Python/FastAPI
- **Purpose:** Simulates a Property Management System with artificial latency for lock operations.

### TravelHub Frontend (`user_interface/`)
- **Stack:** Angular 19 + Ionic + Capacitor
- **Purpose:** Multi-platform web and mobile application for travelers and hotel admins.
- **Key Features:** Property search, booking management, and responsive design.

---

## Authentication & Authorization

The platform uses **AWS Cognito** for user authentication.

### Architecture

1. **Cognito User Pool** — Managed by Terraform (`terraform/stacks/cognito/`). Creates the User Pool, App Client (public, no secret), and two user groups.
2. **Auth Microservice** — Handles registration (`POST /api/auth/register`), login (`POST /api/auth/login`), and token verification (`GET /api/auth/me`). Users are auto-confirmed at registration (no email verification step).
3. **API Gateway JWT Authorizer** — HTTP API (apigatewayv2) validates JWT tokens and injects user identity headers to backend services.

### User Roles (Cognito Groups)

| Role           | Description                                          | Precedence |
|----------------|------------------------------------------------------|------------|
| `travelers`    | Registered travelers searching and booking properties | 2          |
| `hotel-admins` | Hotel administrators managing property listings       | 1          |

### Authentication Flow

1. **Register** — `POST /api/auth/register` with `{ full_name, email, password, role }` (user is auto-confirmed)
2. **Sign in** — `POST /api/auth/login` with `{ email, password }` to obtain `id_token`, `access_token`, and `refresh_token`
3. **Authorize requests** — Send `Authorization: Bearer <id_token>` on all subsequent API calls
4. **Verify token** — `GET /api/auth/me` with `Authorization: Bearer <access_token>` to get user info and role

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

| Workflow | Trigger | Purpose |
|---|---|---|
| `pr_validation.yml` | PR to `main` | Tests all services (Python, Java, Angular), builds Docker images, and runs `terraform plan` on all stacks |
| `deploy_apps.yml` | Manual (`workflow_dispatch`) | Full end-to-end deploy: test → provision infra → build & push all images → deploy all ECS services |
| `deploy_stack.yml` | Manual (`workflow_dispatch`) | Deploy a **single stack** — tests and builds images only when needed, then runs `terraform apply` |
| `seed_database.yml` | Manual (`workflow_dispatch`) | Run a SQL seed script against a specific service database via SSM-retrieved credentials |

### PR Validation (`pr_validation.yml`)

Every PR to `main` runs the following jobs in parallel before merging is allowed:

```
test          (auth · booking · poc-properties — parallel)
test_frontend (travelhub)
  │
  ├── build_and_push   (auth · booking · poc_properties — parallel, needs: test)
  └── build_web_image  (travelhub, needs: test_frontend)
        │
        └── terraform_plan  (all stacks in parallel, needs: test + build_and_push + build_web_image)
```

**Test coverage thresholds enforced on every PR:**

| Service | Framework | Coverage requirement |
|---|---|---|
| `auth`, `booking` | Python / pytest | 80% (configured in `pyproject.toml`) |
| `poc_properties` | Java / JaCoCo | 80% line coverage |
| `travelhub` | Angular / Karma + Jasmine | 85% statements, branches, functions, lines |

Docker images are pushed with two tags: `<commit-sha>` (immutable, for traceability) and `latest` (so `terraform plan` for `ecs_api` and `web_app` can resolve the ECR image digest).

### Full Deploy Pipeline (`deploy_apps.yml`)

```
test
  ├── deploy_ecs_cluster ──────────────────────────┐
  ├── deploy_container_registry → build_and_push ──┤
  ├── deploy_cognito ──────────────────────────────┼── deploy_ecs_api → deploy_api_gateway → seed_database
  ├── deploy_database ─────────────────────────────┘                                      → deploy_web_app
  └── deploy_monitoring
```

Key dependencies:
- **`ecs_api`** depends on `cognito`, `database`, `ecs_cluster`, and `build_and_push`
- **`api_gateway`** depends on `ecs_api` and `cognito` (JWT authorizer needs issuer URL + client ID)
- **`cognito`** deploys in parallel with `ecs_cluster` and `container_registry`

### Single Stack Deploy (`deploy_stack.yml`)

Use this when iterating on a single service or infra change without running the full pipeline.

1. Go to **Actions** → **Deploy Single Stack** → **Run workflow**
2. Select the target **stack** and **environment**

The workflow automatically handles tests, image builds, and redeployment based on the selected stack:

```
stack = ecs_api
  build_backend_images (parallel) → terraform apply ecs_api

stack = web_app
  test_web_app → build_web_image → redeploy container on EC2 (SSM) → terraform apply web_app

stack = anything else
  terraform apply <stack>  (no tests or image build)
```

**Image build behavior by language:**

| Language | Pre-build step | Services |
|---|---|---|
| Python | none | `auth`, `pms`, `booking` |
| Java | `./mvnw clean install -DskipTests` | `poc_properties` |
| .NET | none (multi-stage Dockerfile) | `pricing_engine`, `pricing_orchestator` |

> **Note:** Selecting `deploy_stack.yml` skips dependency checks. Ensure prerequisite stacks are already deployed before running a targeted deploy (e.g., run `cognito` and `database` before `ecs_api`).

### Web App Redeployment (frontend-only changes)

When only the frontend (`user_interface/`) changes, run **Deploy Single Stack** with `stack = web_app`. The workflow:

1. Builds and pushes a new `web_travelhub:latest` image to ECR
2. Connects to the EC2 instance via **AWS SSM Run Command** (no SSH required)
3. Pulls the new image and restarts the `travelhub` container with the current API Gateway URL

No manual SSH needed.

### Triggering a Full Deploy
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

## Database Seeding

Seed scripts are stored under `db/seeds/`, organized by service name (matching the ECS service names used in SSM and Terraform):

```
db/
└── seeds/
    ├── pricing-engine/
    │   └── 001_seed_pricing_data.sql
    ├── poc-properties/
    │   └── 001_seed_properties_data.sql
    └── <service-name>/
        └── 001_<description>.sql
```

The numeric prefix (`001_`, `002_`, …) defines execution order if a service needs multiple scripts run in sequence.

### Running a Seed Script via GitHub Actions

Use the **Seed Database** workflow (`seed_database.yml`), triggered manually:

1. Go to **Actions** → **Seed Database** → **Run workflow**
2. Fill in the inputs:

| Input          | Description                                              | Example                                        |
|----------------|----------------------------------------------------------|------------------------------------------------|
| `sql_file`     | Path to the SQL file (relative to repo root)             | `db/seeds/pricing-engine/001_seed_pricing_data.sql` |
| `service_name` | ECS service name — used to look up the DB name from SSM  | `pricing-engine`                               |
| `environment`  | Target environment                                       | `develop`                                      |

The workflow fetches the database name automatically from SSM at `/{project}/{service_name}/db_name`, so you never need to hardcode it.

### Adding a Seed Script for a New Service

1. Create a folder: `db/seeds/<service-name>/`
2. Add your SQL file: `db/seeds/<service-name>/001_<description>.sql`
3. Trigger the workflow with `service_name = <service-name>` and `sql_file` pointing to your file.

> The `<service-name>` must match the key used in `terraform/environments/develop/ecs_api/terraform.tfvars` and the SSM path `/{project}/{service_name}/db_name`.

---

## API Testing — Postman Collection

The repository includes a Postman collection stored under `postman/` using Postman's native **local git integration** format. Opening this repository as a Postman workspace gives you the full collection in the **Local View** sidebar without any manual import.

### Setup

1. Open **Postman** → **Settings** → **Integrations** → connect this repository.
2. The workspace is pre-configured in `postman/.postman/resources.yaml` (workspace ID `e22eca89-1256-4fa6-8353-cdd4ba6d78f7`).
3. Select the **develop** environment (`postman/postman/environments/develop.yaml`) — it sets `base_url` to the API Gateway invoke URL.

### Collection: `travelhub-backend`

Located at `postman/postman/collections/travelhub-backend/`. Contains four service folders plus a complete end-to-end flow.

**Base URL pattern:** `{{base_url}}/{service-name}/...`

| Folder | Service | Auth | Requests |
|---|---|---|---|
| **Auth** | `auth` | None (public) | Register User, Login, Get Current User, Health Check |
| **Properties** | `poc-properties` | None (public) | Search (no filter / city / capacity / full filter), Get by ID, Lock Property |
| **Booking** | `booking` | JWT (`id_token`) | Create Booking, List My Bookings, Get Booking by ID, Cancel Booking |
| **Booking Orchestrator** | `booking-orchestrator` | JWT (`id_token`) | Create Reservation (saga) |
| **Complete Booking Flow** | multiple | mixed | Steps 01–05 (fully chained) |

### Collection Variables

| Variable | Default | Set by |
|---|---|---|
| `base_url` | `https://3pwlikf891.execute-api.us-east-1.amazonaws.com` | Environment / collection root |
| `id_token` | *(empty)* | Login test script |
| `access_token` | *(empty)* | Login test script |
| `user_id` | *(empty)* | Get Current User test script |
| `user_email` | *(empty)* | Get Current User test script |
| `property_id` | `a1b2c3d4-1111-4000-8000-000000000001` | Manual or Full Filter search script |
| `booking_id` | *(empty)* | Create Booking / Create Reservation test script |

### Complete Booking Flow

Run the **Complete Booking Flow** folder as a **Collection Run** (in order) to execute a full end-to-end reservation:

| Step | Request | What it does |
|---|---|---|
| 01 | Register | Pre-request script generates a unique timestamped email (`flow.traveler.<ts>@example.com`) to avoid conflicts |
| 02 | Login | Saves `id_token` + `access_token` as collection variables |
| 03 | Get Current User | Calls `/auth/me` with the `access_token` to retrieve the Cognito `sub`; saves `user_id` and `user_email` — simulating the `X-User-Id` / `X-User-Email` headers that API Gateway injects automatically on protected routes |
| 04 | Search Property | Searches Cartagena (capacity 4, 01/06/2026–05/06/2026); saves the first result's `id` and `adminGroupId` |
| 05 | Create Reservation | Pre-request script randomises the price (100–500); calls the booking-orchestrator saga with the property from step 04 |

> **Note on `admin_group_id`:** The seeded properties use `admin-1` as their `adminGroupId`, which is not a valid UUID. The `booking` service calls `UUID(admin_group_id)` internally and will reject it. The end-to-end flow will succeed through step 04 but fail at step 05 until the seed data is updated to use UUID-format admin group IDs.

### Authentication Flow in the Collection

```
Register  →  Login (saves id_token, access_token)
                 │
                 ├── id_token  → Authorization: Bearer header on Booking / Booking Orchestrator requests
                 │                API Gateway validates it and injects X-User-Id + X-User-Email
                 │
                 └── access_token → GET /auth/me → retrieves user_id + user_email
                                    (mirrors what API Gateway injects; useful for direct service testing)
```

### File Structure

```
postman/
├── .postman/
│   └── resources.yaml          # Workspace ID binding
└── postman/
    ├── environments/
    │   └── develop.yaml         # base_url for the develop environment
    ├── globals/
    │   └── workspace.globals.yaml
    └── collections/
        └── travelhub-backend/
            ├── collection.yaml               # Collection metadata and variables
            ├── Auth/                         # 4 requests
            ├── Properties/                   # 6 requests
            ├── Booking/                      # 4 requests
            ├── Booking Orchestrator/         # 1 request
            └── Complete Booking Flow/        # 5 chained requests
```

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

### Branch Coverage Report (Terminal Table)
```bash
bash scripts/coverage_report.sh
```

This command runs unit tests for `user_interface` and each project in `services/`, calculates **branch coverage**, and prints a colorized table:
- `user_interface` row in cyan
- `services/*` rows in green
- any row below `85%` in red
- projects without unit tests in red with `0.00%`

---

## Networking Notes

- ECS tasks use `awsvpc` networking on EC2. Task ENIs do **not** get public IPs, even on public subnets.
- The `auth` service reaches Cognito via a **VPC Interface Endpoint** for `cognito-idp` (created in the `ecs_api` stack).
- The VPC endpoint dynamically filters subnets to AZs that support the `cognito-idp` service (not all AZs do).
- The Cognito User Pool must **not** have a domain configured (Managed Login blocks PrivateLink access).
