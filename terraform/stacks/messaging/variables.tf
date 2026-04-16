variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "final-project-miso"
}

variable "notifications_queue_visibility_timeout" {
  description = "Visibility timeout for the notifications queue. Must exceed the longest email-send path."
  type        = number
  default     = 60
}

variable "notifications_queue_max_receive_count" {
  description = "Max deliveries before messages go to the DLQ."
  type        = number
  default     = 5
}

variable "billing_queue_visibility_timeout" {
  description = "Visibility timeout for the billing queue. Must exceed the longest billing processing path."
  type        = number
  default     = 60
}

variable "billing_queue_max_receive_count" {
  description = "Max deliveries before messages go to the billing DLQ."
  type        = number
  default     = 5
}
