output "role_id" {
  description = "Name of the IAM role."
  value       = aws_iam_role.iam_role.id
}

output "role_arn" {
  description = "ARN of the IAM role."
  value       = aws_iam_role.iam_role.arn
}

output "instance_profile_id" {
  description = "ID of the IAM instance profile."
  value       = var.create_instance_profile ? aws_iam_instance_profile.this[0].id : null
}

output "instance_profile_name" {
  description = "Name of the IAM instance profile."
  value       = var.create_instance_profile ? aws_iam_instance_profile.this[0].name : null
}
