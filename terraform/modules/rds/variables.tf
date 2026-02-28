variable "project_name" {
  description = "Project name used for resource naming and SSM paths."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the RDS security group."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block for security group ingress rules."
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the RDS subnet group (private subnets)."
  type        = list(string)
}

variable "db_allocated_storage_gib" {
  description = "Allocated storage in GiB for the RDS instance."
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "17.4"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Name of the default database created on the RDS instance."
  type        = string
  default     = "postgres"
}

variable "db_username" {
  description = "Master username for the RDS instance."
  type        = string
  default     = "dbadmin"
}

variable "db_publicly_accessible" {
  description = "Whether the RDS instance should be publicly accessible from the internet."
  type        = bool
  default     = false
}
