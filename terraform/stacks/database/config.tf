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
    random = {
      source  = "hashicorp/random"
      version = "~> 3"
    }
  }
  backend "s3" {}
}
