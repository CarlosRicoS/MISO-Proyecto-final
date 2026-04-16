output "notifications_queue_url" {
  description = "URL of the notifications SQS queue."
  value       = module.notifications_queue.queue_url
}

output "notifications_queue_arn" {
  description = "ARN of the notifications SQS queue."
  value       = module.notifications_queue.queue_arn
}

output "notifications_dlq_arn" {
  description = "ARN of the notifications dead-letter queue."
  value       = module.notifications_queue.dlq_arn
}

output "notifications_ssm_param_paths" {
  description = "SSM parameter paths for the notifications queue."
  value       = module.notifications_queue.ssm_param_paths
}

output "billing_queue_url" {
  description = "URL of the billing SQS queue."
  value       = module.billing_queue.queue_url
}

output "billing_queue_arn" {
  description = "ARN of the billing SQS queue."
  value       = module.billing_queue.queue_arn
}

output "billing_dlq_arn" {
  description = "ARN of the billing dead-letter queue."
  value       = module.billing_queue.dlq_arn
}

output "billing_ssm_param_paths" {
  description = "SSM parameter paths for the billing queue."
  value       = module.billing_queue.ssm_param_paths
}
