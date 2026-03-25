module "cognito" {
  source = "../../modules/cognito"

  project_name   = var.project_name
  cognito_domain = var.cognito_domain
  callback_urls  = var.callback_urls
  logout_urls    = var.logout_urls
}

# Store Cognito outputs in SSM for cross-stack consumption
resource "aws_ssm_parameter" "user_pool_id" {
  name  = "/${var.project_name}/cognito/user_pool_id"
  type  = "String"
  value = module.cognito.user_pool_id
}

resource "aws_ssm_parameter" "app_client_id" {
  name  = "/${var.project_name}/cognito/app_client_id"
  type  = "String"
  value = module.cognito.app_client_id
}

resource "aws_ssm_parameter" "user_pool_arn" {
  name  = "/${var.project_name}/cognito/user_pool_arn"
  type  = "String"
  value = module.cognito.user_pool_arn
}

resource "aws_ssm_parameter" "issuer_url" {
  name  = "/${var.project_name}/cognito/issuer_url"
  type  = "String"
  value = module.cognito.issuer_url
}
