output "web_app_public_ip" {
  description = "Public IP of the web app EC2 instance."
  value       = module.web_app.public_ip
}

output "web_app_url" {
  description = "URL to access the web app."
  value       = module.web_app.web_app_url
}
