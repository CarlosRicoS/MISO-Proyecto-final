module "notifications_queue" {
  source = "../../modules/sqs"

  name         = "notifications"
  project_name = var.project_name

  visibility_timeout_seconds = var.notifications_queue_visibility_timeout
  max_receive_count          = var.notifications_queue_max_receive_count
}
