provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      "terraform" : true,
    }
  }
}

terraform {
  required_version = "~> 1.14.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.25"
    }
  }
  backend "s3" {}
}