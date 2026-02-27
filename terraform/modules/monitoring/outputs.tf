output "instance_id" {
  description = "EC2 instance ID of the monitoring server."
  value       = aws_instance.monitoring.id
}

output "public_ip" {
  description = "Public IP of the monitoring server."
  value       = aws_instance.monitoring.public_ip
}

output "grafana_url" {
  description = "URL to access Grafana."
  value       = "http://${aws_instance.monitoring.public_ip}:3000"
}

output "prometheus_url" {
  description = "URL to access Prometheus."
  value       = "http://${aws_instance.monitoring.public_ip}:9090"
}
