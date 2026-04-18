variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "app_name" {
  description = "Unique name for this web app deployment (used in resource names to avoid collisions)."
  type        = string
  default     = "web-app"
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "172.16.0.0/16"
}

variable "ssh_key_name" {
  description = "SSH key pair name for the web app EC2 instance."
  type        = string
}

variable "web_app_instance_type" {
  description = "EC2 instance type for the web app server."
  type        = string
  default     = "t3.small"
}

variable "ecr_repository_name" {
  description = "ECR repository name for the web app image."
  type        = string
  default     = "web_travelhub"
}

variable "image_tag" {
  description = "Docker image tag to deploy."
  type        = string
  default     = "latest"
}

variable "api_gateway_ssm_path" {
  description = "SSM parameter path containing the API Gateway URL."
  type        = string
  default     = "/final-project-miso/api-gateway/url"
}
