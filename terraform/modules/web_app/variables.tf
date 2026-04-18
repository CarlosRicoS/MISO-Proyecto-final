variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "app_name" {
  description = "Unique name for this web app deployment (used in resource names)."
  type        = string
  default     = "web-app"
}

variable "vpc_id" {
  description = "VPC ID for the web app instance."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block for security group rules."
  type        = string
}

variable "subnet_id" {
  description = "Public subnet ID for the web app instance."
  type        = string
}

variable "ssh_key_name" {
  description = "SSH key pair name for the EC2 instance."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for the web app server."
  type        = string
  default     = "t3.small"
}

variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

variable "iam_instance_profile_name" {
  description = "IAM instance profile name granting ECR pull and SSM read permissions."
  type        = string
}

variable "ecr_repository_url" {
  description = "Full ECR repository URL for the web app image."
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy."
  type        = string
  default     = "latest"
}

variable "api_gateway_ssm_path" {
  description = "SSM parameter path containing the API Gateway URL."
  type        = string
}
