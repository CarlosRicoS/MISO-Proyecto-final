output "repository_arn" {
  value       = aws_ecr_repository.main.arn
  description = "Repository ARN."
}