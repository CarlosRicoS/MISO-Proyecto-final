# ============================================
# Terraform Makefile
# ============================================
# Usage:
#   make tf-init STACK=ecs_cluster ENV=develop
#   make tf-validate STACK=ecs_cluster
#   make tf-plan STACK=ecs_cluster ENV=develop
#   make tf-apply STACK=ecs_cluster
#   make tf-destroy STACK=ecs_cluster ENV=develop
#   make tf-all STACK=ecs_cluster ENV=develop
#
# Docker/ECR Usage:
#   make ecr-login
#   make docker-build SERVICE=hello_world
#   make docker-push SERVICE=hello_world
#   make docker-deploy SERVICE=hello_world
# ============================================

# Variables (override from command line)
STACK   ?= ecs_cluster
ENV     ?= develop
SERVICE ?= hello_world

# Derived paths
ROOT_DIR       := $(shell pwd)
STACKS_DIR     := $(ROOT_DIR)/terraform/stacks/$(STACK)
ENVS_DIR       := $(ROOT_DIR)/terraform/environments/$(ENV)/$(STACK)
BACKEND_TFVARS := $(ENVS_DIR)/backend.tfvars
TFVARS         := $(ENVS_DIR)/terraform.tfvars
CHDIR          := -chdir=$(STACKS_DIR)

# AWS/ECR variables
AWS_REGION     ?= us-east-1
AWS_ACCOUNT_ID := $(shell aws sts get-caller-identity --query Account --output text)
ECR_REPO       ?= api_$(SERVICE)
ECR_URL        := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPO)
IMAGE_TAG      ?= latest
SERVICE_DIR    := $(ROOT_DIR)/services/$(SERVICE)

# ---- Terraform Targets ----

.PHONY: tf-init tf-validate tf-plan tf-apply tf-destroy tf-all

## Initialize Terraform backend
tf-init:
	terraform $(CHDIR) init -backend-config=$(BACKEND_TFVARS)

## Validate Terraform configuration
tf-validate:
	terraform $(CHDIR) validate

## Plan Terraform changes and save to .tfplan
tf-plan:
	terraform $(CHDIR) plan -var-file=$(TFVARS) -out=.tfplan

## Apply the saved .tfplan
tf-apply:
	terraform $(CHDIR) apply .tfplan

## Destroy infrastructure
tf-destroy:
	terraform $(CHDIR) destroy -auto-approve -var-file=$(TFVARS)

## Run init, validate, plan, and apply in sequence
tf-all: tf-init tf-validate tf-plan tf-apply

# ---- Docker/ECR Targets ----

.PHONY: ecr-login docker-build docker-push docker-deploy

## Login to ECR
ecr-login:
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com

## Build Docker image
docker-build:
	docker build -t $(ECR_REPO):$(IMAGE_TAG) $(SERVICE_DIR)

## Tag Docker image
docker-tag:
	docker tag $(ECR_REPO):$(IMAGE_TAG) $(ECR_URL):$(IMAGE_TAG)

## Push Docker image to ECR
docker-push:
	docker push $(ECR_URL):$(IMAGE_TAG)

## Build, tag, and push in one step
docker-deploy: ecr-login docker-build docker-tag docker-push

# ---- Test Targets ----

.PHONY: unittest-uv

DIR ?= .

## Run unit tests with uv and pytest (with coverage enforcement)
unittest-uv:
	cd $(DIR) && uv sync --group dev && uv run pytest tests/ -v --cov=main --cov-report=term-missing --cov-fail-under=80
