output "alb_dns_names" {
  description = "Map of service name to ALB DNS name."
  value       = { for k, v in module.ecs_service : k => v.alb_dns_name }
}
