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

variable "services" {
  description = "Map of services to integrate with the API Gateway. Each entry creates an integration and route."
  type = map(object({
    listener_arn = string
    route_prefix = string
  }))
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
