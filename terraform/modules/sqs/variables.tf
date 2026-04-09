variable "name" {
  description = "Logical name of the queue (e.g. \"notifications\"). Used for the queue name and SSM param path."
  type        = string
}

variable "project_name" {
  description = "Project name used as the SSM parameter path prefix."
  type        = string
}

variable "visibility_timeout_seconds" {
  description = "How long a message is invisible after a consumer receives it (must exceed max expected handler time)."
  type        = number
  default     = 60
}

variable "message_retention_seconds" {
  description = "How long SQS keeps a message before dropping it. Default 14 days (maximum)."
  type        = number
  default     = 1209600
}

variable "receive_wait_time_seconds" {
  description = "Long-poll wait time on ReceiveMessage calls."
  type        = number
  default     = 20
}

variable "max_receive_count" {
  description = "Number of times a message can be received before it is sent to the DLQ."
  type        = number
  default     = 5
}

variable "tags" {
  description = "Extra tags merged into every resource."
  type        = map(string)
  default     = {}
}
