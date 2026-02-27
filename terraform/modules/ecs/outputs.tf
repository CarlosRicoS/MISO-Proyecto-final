output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.ecs_cluster.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.ecs_cluster.arn
}

output "security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs_sg.id
}
