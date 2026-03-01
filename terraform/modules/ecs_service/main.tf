resource "aws_ecs_service" "service" {
  name            = "${var.project_name}-${var.service_name}-ecs-service"
  cluster         = data.aws_ecs_cluster.ecs_cluster.id
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.desired_count_tasks

  network_configuration {
    subnets         = data.aws_subnets.public.ids
    security_groups = [data.aws_security_group.ecs_sg.id]
  }

  force_new_deployment = var.force_new_deployment
  placement_constraints {
    type = var.placement_constraint_type
  }

  capacity_provider_strategy {
    capacity_provider = var.capacity_provider_name
    weight            = 100
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }
}


resource "aws_ecs_task_definition" "service" {
  family             = "${var.project_name}-${var.service_name}-ecs-task-definition"
  network_mode       = "awsvpc"
  task_role_arn      = var.ecs-task-execution-role
  execution_role_arn = var.ecs-task-execution-role
  cpu                = var.ecs_task_size.cpu
  runtime_platform {
    operating_system_family = var.runtime_platform.os_family
    cpu_architecture        = var.runtime_platform.cpu_architecture
  }

  container_definitions = jsonencode([
    {
      name        = var.container_name
      image       = "${var.ec2_image_uri}@${data.aws_ecr_image.service.image_digest}"
      cpu         = var.ecs_task_size.cpu
      memory      = var.ecs_task_size.memory
      essential   = true
      environment = var.environment_variables
      secrets     = var.secrets
      # command     = [var.container_command]
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}",
          "awslogs-region"        = var.aws_region,
          "awslogs-stream-prefix" = "ecs",
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])

  tags = {
    TaskName : "Web"
  }

  depends_on = [
    aws_ssm_parameter.access_key_id,
    aws_ssm_parameter.secret_access_key,
    aws_ssm_parameter.session_token,
  ]
}

resource "aws_lb_target_group" "service" {
  name_prefix = "ws-tg-"
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.vpc.id

  deregistration_delay = var.deregistration_delay

  health_check {
    enabled             = true
    path                = var.health_check.path
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = var.health_check.matcher
    interval            = var.health_check.interval
    timeout             = var.health_check.timeout
    healthy_threshold   = var.health_check.healthy_threshold
    unhealthy_threshold = var.health_check.unhealthy_threshold
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_appautoscaling_target" "service" {
  max_capacity       = var.autoscaling.max_capacity
  min_capacity       = var.autoscaling.min_capacity
  resource_id        = "service/${data.aws_ecs_cluster.ecs_cluster.cluster_name}/${aws_ecs_service.service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "service" {
  name               = "ecs-service-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service.resource_id
  scalable_dimension = aws_appautoscaling_target.service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = var.autoscaling.target_cpu_utilization
    scale_out_cooldown = var.autoscaling.scale_out_cooldown
  }
}

resource "aws_lb" "service" {
  name               = "${var.service_name}-ecs-alb"
  internal           = var.alb_internal
  load_balancer_type = "application"
  security_groups    = [aws_security_group.security_group.id]
  subnets            = data.aws_subnets.private.ids

  enable_cross_zone_load_balancing = true
  idle_timeout                     = var.alb_idle_timeout

  tags = {
    Name = "${var.service_name}-load-balancer"
  }
}

resource "aws_lb_listener" "service" {
  load_balancer_arn = aws_lb.service.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }
}

resource "aws_ssm_parameter" "alb_listener_arn" {
  name  = "/${var.project_name}/${var.service_name}/alb_listener_arn"
  type  = "String"
  value = aws_lb_listener.service.arn
}

resource "aws_ssm_parameter" "service_url" {
  name  = "/${var.project_name}/${var.service_name}/service_url"
  type  = "String"
  value = "http://${aws_lb.service.dns_name}"
}