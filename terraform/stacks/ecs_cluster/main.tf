module "vpc" {
  source       = "../../modules/vpc"
  vpc_cidr     = var.vpc_cidr
  project_name = var.project_name
  aws_region   = var.aws_region

  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
}