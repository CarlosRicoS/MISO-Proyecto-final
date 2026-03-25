variable "project_name" {
  description = "Project name used as prefix for resource naming"
  type        = string
}

variable "cognito_domain" {
  description = "Prefix for the Cognito hosted UI domain (e.g. travelhub-dev)"
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

variable "groups" {
  description = "Map of Cognito user groups to create"
  type = map(object({
    description = string
    precedence  = number
  }))
  default = {
    "travelers" = {
      description = "Registered travelers"
      precedence  = 2
    }
    "hotel-admins" = {
      description = "Hotel administrators"
      precedence  = 1
    }
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
