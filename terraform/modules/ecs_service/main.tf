resource "aws_ecs_service" "service" {
  name            = "${var.project_name}-${var.service_name}-ecs-service"
  cluster         = data.aws_ecs_cluster.ecs_cluster.id
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.desired_count_tasks

  network_configuration {
    subnets         = data.aws_subnets.public.ids
    security_groups = [data.aws_security_group.ecs_sg.id]
  }

  force_new_deployment = true
  placement_constraints {
    type = "distinctInstance"
  }

  capacity_provider_strategy {
    capacity_provider = "capacity-provider"
    weight            = 100
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service.arn
    container_name   = "web_app"
    container_port   = 80
  }
}


resource "aws_ecs_task_definition" "service" {
  family             = "${var.project_name}-${var.service_name}-ecs-task-definition"
  network_mode       = "awsvpc"
  task_role_arn      = var.ecs-task-execution-role
  execution_role_arn = var.ecs-task-execution-role
  cpu                = 1024
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name        = "web_app"
      image       = var.ec2_image_uri
      cpu         = var.ecs_task_size.cpu
      memory      = var.ecs_task_size.memory
      essential   = true
      environment = var.environment_variables
      secrets     = var.secrets
      # command     = [var.container_command]
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = 80
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
    aws_ssm_parameter.db_host,
    aws_ssm_parameter.db_username,
    aws_ssm_parameter.db_password
  ]
}

resource "aws_lb_target_group" "service" {
  name_prefix = "ws-tg-"
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.vpc.id

  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_appautoscaling_target" "service" {
  max_capacity       = 6
  min_capacity       = 2
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

    target_value       = 40.0
    scale_out_cooldown = 30
  }
}

resource "aws_lb" "service" {
  name               = "${var.service_name}-ecs-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.security_group.id]
  subnets            = data.aws_subnets.public.ids

  enable_cross_zone_load_balancing = true
  idle_timeout                     = 60

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