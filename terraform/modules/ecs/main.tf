terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.17.0"
    }
  }
}

# Fetch the latest Ubuntu AMI ID for the specified region
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-amd64-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_ecs_cluster" "ecs_cluster" {
  name = "${var.project_name}-ecs-cluster"
}

resource "aws_launch_template" "ecs_cluster" {
  name_prefix            = "ec2_ecs-launch-template-"
  image_id               = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ssh_key_name
  vpc_security_group_ids = [aws_security_group.ecs_sg.id]

  iam_instance_profile {
    name = var.iam_instance_profile_name
  }

  monitoring {
    enabled = true
  }

  lifecycle {
    create_before_destroy = true
  }

  user_data = filebase64("${path.module}/ec2-ecs.sh")
}

resource "aws_autoscaling_group" "ecs_cluster" {
  name_prefix         = "ec2-asg-"
  desired_capacity    = var.asg_capacity["desired_capacity"]
  max_size            = var.asg_capacity["max_size"]
  min_size            = var.asg_capacity["min_size"]
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.ecs_cluster.id
    version = "$Latest"
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = true
    propagate_at_launch = true
  }
}

resource "aws_ecs_capacity_provider" "ecs_cluster" {
  name = "capacity-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs_cluster.arn

    managed_scaling {
      instance_warmup_period    = 120
      maximum_scaling_step_size = 1
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "ecs_cluster" {
  cluster_name = aws_ecs_cluster.ecs_cluster.name

  capacity_providers = [aws_ecs_capacity_provider.ecs_cluster.name]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = aws_ecs_capacity_provider.ecs_cluster.name
  }
}
