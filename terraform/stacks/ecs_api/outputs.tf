output "ecr_arn_repository_hello_world" {
  value       = module.ecr_repository_hello_world.repository_arn
  description = "Created Hello World APP repository ARN."
}

output "ecr_url_repository_hello_world" {
  value       = module.ecr_repository_hello_world.repository_url
  description = "Created Hello World APP repository URL."
}

output "alb_dns_name_hello_world" {
  value       = module.ecs_service_hello_world.alb_dns_name
  description = "DNS name of the Hello World ALB."
}
