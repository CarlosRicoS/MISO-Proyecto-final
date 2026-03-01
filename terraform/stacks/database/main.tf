data "aws_vpc" "vpc" {
  cidr_block = var.vpc_cidr
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.vpc.id]
  }

  tags = {
    is_public = "false"
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.vpc.id]
  }

  tags = {
    is_public = "true"
  }
}

module "rds" {
  source = "../../modules/rds"

  project_name             = var.project_name
  vpc_id                   = data.aws_vpc.vpc.id
  vpc_cidr                 = var.vpc_cidr
  subnet_ids               = var.db_publicly_accessible ? data.aws_subnets.public.ids : data.aws_subnets.private.ids
  db_allocated_storage_gib = var.db_allocated_storage_gib
  db_engine_version        = var.db_engine_version
  db_instance_class        = var.db_instance_class
  db_name                  = var.db_name
  db_username              = var.db_username
  db_publicly_accessible   = var.db_publicly_accessible
  db_max_connections       = var.db_max_connections
}
