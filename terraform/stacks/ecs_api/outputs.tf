output "alb_dns_names" {
  description = "Map of service name to ALB DNS name."
  value       = { for k, v in module.ecs_service : k => v.alb_dns_name }
}

output "ecs_service_names" {
  description = "Map of service name to ECS service name."
  value       = { for k, v in module.ecs_service : k => v.ecs_service_name }
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster."
  value       = values(module.ecs_service)[0].ecs_cluster_name
}
