variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "172.16.0.0/16"
}

variable "ssh_key_name" {
  description = "SSH key pair name for the monitoring EC2 instance."
  type        = string
}

variable "monitoring_instance_type" {
  description = "EC2 instance type for the monitoring server."
  type        = string
  default     = "t3.small"
}
