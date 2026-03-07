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
  description = "Name of the default database."
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

variable "db_max_connections" {
  description = "Maximum number of connections to the database."
  type        = number
  default     = 150
}
