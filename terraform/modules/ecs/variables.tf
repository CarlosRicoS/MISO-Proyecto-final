variable "project_name" {
  type    = string
  default = "final-project-miso"
}

variable "ec2_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "ssh_key_name" {
  type        = string
  description = "SSH Key used to create the EC2 instance"
  default     = "remote-ssh-key-pair"
}

variable "iam_instance_profile_name" {
  description = "Name of the IAM instance profile for ECS EC2 instances"
  type        = string
}

variable "asg_capacity" {
  type = map(any)
  default = {
    "desired_capacity" = 3
    "max_size"         = 6
    "min_size"         = 3
  }
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR"
  default     = "172.16.0.0/16"
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ASG"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID for the security group"
  type        = string
}

