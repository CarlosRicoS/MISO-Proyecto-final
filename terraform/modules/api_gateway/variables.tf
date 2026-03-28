variable "api_name" {
  description = "Name of the HTTP API Gateway"
  type        = string
}

variable "subnet_ids" {
  description = "List of private subnet IDs for the VPC Link"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID for the VPC Link security group"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block for security group rules"
  type        = string
}

variable "issuer_url" {
  description = "Cognito issuer URL for JWT validation. Empty string disables auth."
  type        = string
  default     = ""
}

variable "cognito_client_id" {
  description = "Cognito App Client ID for JWT audience validation."
  type        = string
  default     = ""
}

variable "services" {
  description = "Map of services to integrate with the API Gateway. Each entry creates an integration and route."
  type = map(object({
    listener_arn       = string
    route_prefix       = string
    authorization_type = optional(string, "COGNITO")
  }))
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}