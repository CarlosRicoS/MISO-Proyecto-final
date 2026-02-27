output "alb_dns_name_hello_world" {
  value       = module.ecs_service_hello_world.alb_dns_name
  description = "DNS name of the Hello World ALB."
}
