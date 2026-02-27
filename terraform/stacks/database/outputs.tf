output "rds_address" {
  description = "RDS instance endpoint address."
  value       = module.rds.address
}

output "rds_port" {
  description = "RDS instance port."
  value       = module.rds.port
}

output "rds_db_name" {
  description = "Name of the default database."
  value       = module.rds.db_name
}
