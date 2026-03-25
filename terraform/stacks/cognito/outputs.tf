output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = module.cognito.user_pool_id
}

output "app_client_id" {
  description = "The ID of the SPA app client"
  value       = module.cognito.app_client_id
}

output "issuer_url" {
  description = "The issuer URL for JWT validation"
  value       = module.cognito.issuer_url
}

output "hosted_ui_domain" {
  description = "The full domain for the Cognito hosted UI"
  value       = module.cognito.hosted_ui_domain
}
