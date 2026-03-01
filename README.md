# MISO Project - Final Project

This repository contains the source code and infrastructure-as-code (Terraform) for the MISO Final Project. The architecture consists of multiple microservices deployed on AWS ECS (EC2-backed), integrated with an API Gateway and shared RDS PostgreSQL instance.

## Project Structure

- `services/`: Contains the source code for each microservice.
- `terraform/`: Contains all Terraform infrastructure.
    - `modules/`: Reusable Terraform modules (VPC, ECS, ECR, etc.).
    - `stacks/`: Top-level Terraform stacks that compose modules together.
    - `environments/`: Environment-specific configuration (`tfvars`).
- `.github/workflows/`: CI/CD pipelines for testing, building, and deploying.

---

## How to Define and Add a New Service

To add a new service to the ecosystem, follow these steps:

### 1. Develop the Service
1. Create a new directory under `services/` (e.g., `services/my-new-service`).
2. Add your application code (e.g., Python FastAPI).
3. Add a `Dockerfile` that exposes the application on a specific port (default is `80`).
4. Add tests for your application.

### 2. Define Infrastructure (Terraform)
You need to update three Terraform stacks in `terraform/environments/develop/`:

#### A. Container Registry (ECR)
Edit `terraform/environments/develop/container_registry/terraform.tfvars`:
Add your new repository name to the `repository_names` list.
```hcl
repository_names = ["api_hello_world", "api_other_service", "api_my_new_service"]
```

#### B. ECS Service
Edit `terraform/environments/develop/ecs_api/terraform.tfvars`:
Add a new entry to the `services` map. The key should be the service name (kebab-case).
```hcl
services = {
  "my-new-service" = {
    ecr_repository_name = "api_my_new_service"
    create_database     = true # Set to true if you need a dedicated PostgreSQL database
    container_port      = 80
    desired_count_tasks = 2
  }
}
```

#### C. API Gateway
Edit `terraform/environments/develop/api_gateway/terraform.tfvars`:
Add your service name to the `service_names` list to expose it via the API Gateway.
```hcl
service_names = ["hello-world", "other-service", "my-new-service"]
```

### 3. Update CI/CD Workflow
Edit `.github/workflows/deploy_apps.yml`:
Add your service to the `matrix` in the `test` and `build_and_push` jobs.

```yaml
jobs:
  test:
    strategy:
      matrix:
        include:
          - name: my-new-service
            language: python
            context-path: services/my-new-service
  # ...
  build_and_push:
    strategy:
      matrix:
        include:
          - name: my-new-service
            ecr-repo: api_my_new_service
            context-path: services/my-new-service
```

---

## Deployment Workflow

The project uses GitHub Actions for automated deployment.

1. **Triggering Deployment:**
   - Go to the **Actions** tab in GitHub.
   - Select the **Deploy Applications** workflow.
   - Click **Run workflow** and select the target environment (e.g., `develop`).

2. **Pipeline Steps:**
   - **Test:** Runs unit tests for each service in parallel.
   - **Infrastructure (Registry/Cluster):** Ensures ECR repositories and the ECS cluster are provisioned.
   - **Build and Push:** Builds Docker images and pushes them to ECR.
   - **Infrastructure (Database/Monitoring):** Provisions shared resources like RDS and monitoring tools.
   - **Infrastructure (ECS API):** Deploys/Updates the ECS services with the latest images.
   - **Infrastructure (API Gateway):** Updates the API Gateway routes to point to the new service ALBs.

## Database Integration
If `create_database = true` is set for a service:
1. Terraform creates a new PostgreSQL database named after the service.
2. It generates SSM parameters for connectivity:
   - `/{project_name}/{service_name}/db_host`
   - `/{project_name}/{service_name}/db_name`
   - `/{project_name}/{service_name}/db_username`
   - `/{project_name}/{service_name}/db_password`

*Note: Ensure your application is configured to read these parameters (e.g., via environment variables or direct SSM lookup).*

---

## Local Development
