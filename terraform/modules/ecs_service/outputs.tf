output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.service.dns_name
}