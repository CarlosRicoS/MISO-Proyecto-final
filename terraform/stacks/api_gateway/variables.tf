variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "172.16.0.0/16"
}

variable "service_names" {
  description = "List of ECS service names to integrate with the API Gateway. Each must have a corresponding ALB listener ARN in SSM."
  type        = list(string)
}

variable "enable_auth" {
  description = "Enable Cognito JWT authentication on the API Gateway"
  type        = bool
  default     = false
}

variable "public_services" {
  description = "Service names with fully public routes (no Cognito auth)"
  type        = list(string)
  default     = []
}
