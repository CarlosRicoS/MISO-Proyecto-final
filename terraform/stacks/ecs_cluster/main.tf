module "vpc" {
  source       = "../../modules/vpc"
  vpc_cidr     = var.vpc_cidr
  project_name = var.project_name
  aws_region   = var.aws_region

  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
}

module "ecsInstanceRole" {
  source = "../../modules/iam"

  role_name        = "ecsInstanceRole"
  role_description = "Allows EC2 instances to call ECS services."

  service_principal = [
    "ec2.amazonaws.com"
  ]

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role",
  ]

  create_instance_profile = true
}

module "ecs" {
  source = "../../modules/ecs"

  ec2_instance_type         = var.ec2_instance_type
  ssh_key_name              = var.ssh_key_name
  vpc_cidr                  = var.vpc_cidr
  asg_capacity              = var.asg_capacity
  iam_instance_profile_name = module.ecsInstanceRole.instance_profile_name
  subnet_ids                = module.vpc.public_subnet_ids
  vpc_id                    = module.vpc.vpc_id
  managed_scaling           = var.managed_scaling
  capacity_provider_base    = var.capacity_provider_base
  capacity_provider_weight  = var.capacity_provider_weight
}