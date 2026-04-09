output "queue_url" {
  description = "URL of the main SQS queue."
  value       = aws_sqs_queue.main.url
}

output "queue_arn" {
  description = "ARN of the main SQS queue."
  value       = aws_sqs_queue.main.arn
}

output "queue_name" {
  description = "Name of the main SQS queue."
  value       = aws_sqs_queue.main.name
}

output "dlq_url" {
  description = "URL of the dead-letter queue."
  value       = aws_sqs_queue.dlq.url
}

output "dlq_arn" {
  description = "ARN of the dead-letter queue."
  value       = aws_sqs_queue.dlq.arn
}

output "ssm_param_paths" {
  description = "All SSM parameter paths created by this module."
  value = [
    aws_ssm_parameter.queue_url.name,
    aws_ssm_parameter.queue_arn.name,
    aws_ssm_parameter.queue_name.name,
    aws_ssm_parameter.dlq_url.name,
    aws_ssm_parameter.dlq_arn.name,
  ]
}
