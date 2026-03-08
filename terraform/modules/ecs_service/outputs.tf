output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.service.dns_name
}

output "ecs_service_name" {
  value = aws_ecs_service.service.name
}

output "ecs_cluster_name" {
  value = data.aws_ecs_cluster.ecs_cluster.cluster_name
}