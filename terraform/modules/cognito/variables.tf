variable "project_name" {
  description = "Project name used as prefix for resource naming"
  type        = string
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
