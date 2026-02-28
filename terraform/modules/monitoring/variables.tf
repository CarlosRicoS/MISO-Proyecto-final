variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the monitoring instance."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block for security group rules."
  type        = string
}

variable "subnet_id" {
  description = "Public subnet ID for the monitoring instance."
  type        = string
}

variable "ssh_key_name" {
  description = "SSH key pair name for the EC2 instance."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for the monitoring server."
  type        = string
  default     = "t3.small"
}

variable "aws_region" {
  description = "AWS region for Prometheus EC2 service discovery."
  type        = string
  default     = "us-east-1"
}

variable "iam_instance_profile_name" {
  description = "IAM instance profile name granting ec2:DescribeInstances for Prometheus SD."
  type        = string
}
