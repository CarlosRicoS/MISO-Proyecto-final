output "instance_id" {
  description = "EC2 instance ID of the web app server."
  value       = aws_instance.web_app.id
}

output "public_ip" {
  description = "Public IP of the web app server."
  value       = aws_instance.web_app.public_ip
}

output "web_app_url" {
  description = "URL to access the web app."
  value       = "http://${aws_instance.web_app.public_ip}"
}
