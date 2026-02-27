output "address" {
  description = "RDS instance endpoint address."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "RDS instance port."
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Name of the default database."
  value       = aws_db_instance.this.db_name
}
