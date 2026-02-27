aws_region   = "us-east-1"
project_name = "final-project-miso"

vpc_cidr        = "172.16.0.0/16"
private_subnets = ["172.16.10.0/24", "172.16.20.0/24", "172.16.30.0/24"]
public_subnets  = ["172.16.1.0/24", "172.16.2.0/24", "172.16.3.0/24"]

ec2_instance_type = "t3.small"
ssh_key_name      = "remote-ssh-key-pair"
asg_capacity = {
  "desired_capacity" = 3
  "max_size"         = 6
  "min_size"         = 3
}
