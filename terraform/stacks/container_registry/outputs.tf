output "repository_urls" {
  description = "Map of repository name to repository URL."
  value = {
    for name in var.repository_names : name => module.ecr[name].repository_url
  }
}

output "repository_arns" {
  description = "Map of repository name to repository ARN."
  value = {
    for name in var.repository_names : name => module.ecr[name].repository_arn
  }
}
