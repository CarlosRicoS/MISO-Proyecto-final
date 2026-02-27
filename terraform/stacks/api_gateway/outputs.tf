output "api_endpoint" {
  description = "The invoke URL of the HTTP API Gateway"
  value       = module.api_gateway.api_endpoint
}

output "api_id" {
  description = "The ID of the HTTP API Gateway"
  value       = module.api_gateway.api_id
}

output "vpc_link_id" {
  description = "The ID of the VPC Link"
  value       = module.api_gateway.vpc_link_id
}
