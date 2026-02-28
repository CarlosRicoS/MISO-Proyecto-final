output "api_endpoint" {
  description = "The invoke URL of the HTTP API Gateway"
  value       = aws_apigatewayv2_stage.this.invoke_url
}

output "api_id" {
  description = "The ID of the HTTP API Gateway"
  value       = aws_apigatewayv2_api.this.id
}

output "vpc_link_id" {
  description = "The ID of the VPC Link"
  value       = aws_apigatewayv2_vpc_link.this.id
}

output "vpc_link_security_group_id" {
  description = "The ID of the VPC Link security group"
  value       = aws_security_group.vpc_link.id
}
