locals {
  queue_name = "${var.project_name}-${var.name}"
  dlq_name   = "${var.project_name}-${var.name}-dlq"
  ssm_prefix = "/${var.project_name}/${var.name}"
}

resource "aws_sqs_queue" "dlq" {
  name                      = local.dlq_name
  message_retention_seconds = var.message_retention_seconds

  tags = merge(var.tags, {
    Name = local.dlq_name
    Role = "dead-letter"
  })
}

resource "aws_sqs_queue" "main" {
  name                       = local.queue_name
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Name = local.queue_name
    Role = "main"
  })
}

# SSM parameters so producer and consumer services can resolve the queue
# via the existing ecs_service `secrets` wiring without hardcoding ARNs.
resource "aws_ssm_parameter" "queue_url" {
  name  = "${local.ssm_prefix}/queue_url"
  type  = "String"
  value = aws_sqs_queue.main.url
  tags  = var.tags
}

resource "aws_ssm_parameter" "queue_arn" {
  name  = "${local.ssm_prefix}/queue_arn"
  type  = "String"
  value = aws_sqs_queue.main.arn
  tags  = var.tags
}

resource "aws_ssm_parameter" "queue_name" {
  name  = "${local.ssm_prefix}/queue_name"
  type  = "String"
  value = aws_sqs_queue.main.name
  tags  = var.tags
}

resource "aws_ssm_parameter" "dlq_url" {
  name  = "${local.ssm_prefix}/dlq_url"
  type  = "String"
  value = aws_sqs_queue.dlq.url
  tags  = var.tags
}

resource "aws_ssm_parameter" "dlq_arn" {
  name  = "${local.ssm_prefix}/dlq_arn"
  type  = "String"
  value = aws_sqs_queue.dlq.arn
  tags  = var.tags
}
