data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-amd64-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "web_app" {
  name        = "${var.project_name}-${var.app_name}-sg"
  description = "Security group for the web app EC2 instance"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.app_name}-sg"
  }
}

resource "aws_instance" "web_app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = var.ssh_key_name
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.web_app.id]
  associate_public_ip_address = true

  iam_instance_profile = var.iam_instance_profile_name

  user_data_base64 = base64encode(templatefile("${path.module}/user_data.sh.tpl", {
    aws_region           = var.aws_region
    ecr_repository_url   = var.ecr_repository_url
    image_tag            = var.image_tag
    api_gateway_ssm_path = var.api_gateway_ssm_path
    container_name       = var.app_name
  }))

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project_name}-${var.app_name}"
  }
}
