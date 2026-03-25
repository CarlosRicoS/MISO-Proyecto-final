variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "cognito_domain" {
  description = "Prefix for the Cognito hosted UI domain"
  type        = string
}

variable "callback_urls" {
  description = "Allowed callback URLs for the SPA client"
  type        = list(string)
  default     = ["http://localhost:4200"]
}

variable "logout_urls" {
  description = "Allowed logout URLs for the SPA client"
  type        = list(string)
  default     = ["http://localhost:4200"]
}
