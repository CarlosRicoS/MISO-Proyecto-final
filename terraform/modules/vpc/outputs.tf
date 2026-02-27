output "vpc_id" {
  value = aws_vpc.main.id
}

output "vpc_security_group_id" {
  value = aws_security_group.vpc.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = [for s in aws_subnet.private : s.id]
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = [for s in aws_subnet.public : s.id]
}
