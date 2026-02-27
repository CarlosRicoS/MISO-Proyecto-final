variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "keep_tags_number" {
  description = "The number of image tags to retain in each repository."
  type        = number
  default     = 5
}

variable "repository_names" {
  description = "List of ECR repository names to create."
  type        = list(string)
}
