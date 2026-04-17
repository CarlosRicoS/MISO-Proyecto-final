module "notifications_queue" {
  source = "../../modules/sqs"

  name         = "notifications"
  project_name = var.project_name

  visibility_timeout_seconds = var.notifications_queue_visibility_timeout
  max_receive_count          = var.notifications_queue_max_receive_count
}

module "billing_queue" {
  source = "../../modules/sqs"

  name         = "billing"
  project_name = var.project_name

  visibility_timeout_seconds = var.billing_queue_visibility_timeout
  max_receive_count          = var.billing_queue_max_receive_count
}

# ---------------------------------------------------------------------------
# Local / test queues — used by docker-compose for local development.
# Same config as production queues but with a "test-" prefix.
# ---------------------------------------------------------------------------

module "test_notifications_queue" {
  source = "../../modules/sqs"

  name         = "test-notifications"
  project_name = var.project_name

  visibility_timeout_seconds = var.notifications_queue_visibility_timeout
  max_receive_count          = var.notifications_queue_max_receive_count
}

module "test_billing_queue" {
  source = "../../modules/sqs"

  name         = "test-billing"
  project_name = var.project_name

  visibility_timeout_seconds = var.billing_queue_visibility_timeout
  max_receive_count          = var.billing_queue_max_receive_count
}
