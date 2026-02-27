resource "random_password" "master" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-rds-${var.db_publicly_accessible ? "public" : "private"}"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "this" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow PostgreSQL traffic from VPC"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.db_publicly_accessible ? ["0.0.0.0/0"] : [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

resource "aws_db_instance" "this" {
  allocated_storage      = var.db_allocated_storage_gib
  engine                 = "postgres"
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  db_name                = var.db_name
  username               = var.db_username
  password               = random_password.master.result
  skip_final_snapshot    = true
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  publicly_accessible    = var.db_publicly_accessible

  tags = {
    Name = "${var.project_name}-rds"
  }
}

resource "aws_ssm_parameter" "db_host" {
  name  = "/${var.project_name}/rds/host"
  type  = "String"
  value = aws_db_instance.this.address
}

resource "aws_ssm_parameter" "db_port" {
  name  = "/${var.project_name}/rds/port"
  type  = "String"
  value = tostring(aws_db_instance.this.port)
}

resource "aws_ssm_parameter" "db_username" {
  name  = "/${var.project_name}/rds/username"
  type  = "SecureString"
  value = aws_db_instance.this.username
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project_name}/rds/password"
  type  = "SecureString"
  value = random_password.master.result
}
