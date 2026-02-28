output "monitoring_instance_public_ip" {
  description = "Public IP of the monitoring EC2 instance."
  value       = module.monitoring.public_ip
}

output "grafana_url" {
  description = "URL to access Grafana."
  value       = module.monitoring.grafana_url
}

output "prometheus_url" {
  description = "URL to access Prometheus."
  value       = module.monitoring.prometheus_url
}
