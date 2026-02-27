output "vpc_id" {
  value = aws_vpc.main.id
}

output "vpc_security_group_id" {
  value = aws_security_group.vpc.id
}