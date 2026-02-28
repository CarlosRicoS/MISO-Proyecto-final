variable "role_name" {
  type        = string
  description = "The name of the role"
}

variable "role_description" {
  type        = string
  description = "The description of the role"
}

variable "service_principal" {
  type        = list(string)
  description = "The service principal the role is for"
}

variable "managed_policy_arns" {
  type        = list(string)
  description = "The managed policy arns the role is for"
  default     = null
}

variable "create_instance_profile" {
  type        = bool
  description = "Whether to create an instance profile for the role"
  default     = false
}

variable "inline_policies" {
  description = "A map of inline policy names to their JSON policy documents to attach to the role"
  type        = map(string)
  default     = {}
}