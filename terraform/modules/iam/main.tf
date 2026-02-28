resource "aws_iam_role" "iam_role" {
  name        = var.role_name
  description = var.role_description

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = flatten([
      length(var.service_principal) > 0 ? [
        {
          Action = "sts:AssumeRole"
          Effect = "Allow"
          Principal = {
            Service = var.service_principal
          }
        }
      ] : []
    ])
  })

  tags = {
    Name = var.role_name
  }
}

resource "aws_iam_role_policy_attachment" "iam_role_policies" {
  for_each = var.managed_policy_arns != null ? toset(var.managed_policy_arns) : []

  role       = aws_iam_role.iam_role.name
  policy_arn = each.value
}

resource "aws_iam_instance_profile" "this" {
  count = var.create_instance_profile ? 1 : 0

  name = var.role_name
  role = aws_iam_role.iam_role.name
}