output "repository_arn" {
  value       = aws_ecr_repository.main.arn
  description = "Repository ARN."
}

output "repository_url" {
  value       = aws_ecr_repository.main.repository_url
  description = "Repository URL."
}
