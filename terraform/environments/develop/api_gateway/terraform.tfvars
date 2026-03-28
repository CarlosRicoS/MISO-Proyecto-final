aws_region   = "us-east-1"
project_name = "final-project-miso"
vpc_cidr     = "172.16.0.0/16"

service_names = [
  "pms",
  "poc-properties",
  "pricing-engine",
  "pricing-orchestator",
  "booking",
  "auth"
]

enable_auth = true

public_services = [
  "auth",
  "poc-properties",
  "pricing-engine",
  "pricing-orchestator"
]
