resource "aws_apigatewayv2_api" "this" {
  name          = var.api_name
  description   = "HTTP API Gateway for ${var.api_name}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["*"]
    allow_methods     = ["*"]
    allow_origins     = ["*"]
    expose_headers    = []
    max_age           = 0
  }

  tags = var.tags
}

resource "aws_security_group" "vpc_link" {
  name        = "${var.api_name}-vpc-link-sg"
  description = "Security group for API Gateway VPC Link"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(var.tags, {
    Name = "${var.api_name}-vpc-link-sg"
  })
}

resource "aws_apigatewayv2_vpc_link" "this" {
  name               = "${var.api_name}-vpc-link"
  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.vpc_link.id]

  tags = var.tags
}

# --- JWT Authorizer (Cognito) ---

resource "aws_apigatewayv2_authorizer" "cognito" {
  count            = var.issuer_url != "" ? 1 : 0
  api_id           = aws_apigatewayv2_api.this.id
  authorizer_type  = "JWT"
  name             = "${var.api_name}-cognito-jwt"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [var.cognito_client_id]
    issuer   = var.issuer_url
  }
}

# --- Per-service integrations ---

resource "aws_apigatewayv2_integration" "service" {
  for_each = var.services

  api_id             = aws_apigatewayv2_api.this.id
  integration_type   = "HTTP_PROXY"
  integration_uri    = each.value.listener_arn
  integration_method = "ANY"
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.this.id

  request_parameters = merge(
    { "overwrite:path" = "/$request.path.proxy" },
    each.value.authorization_type == "COGNITO" ? {
      "append:header.X-User-Id"    = "$context.authorizer.claims.sub"
      "append:header.X-User-Email" = "$context.authorizer.claims.email"
    } : {}
  )
}

# --- Routes: proxy path + root path per service ---

resource "aws_apigatewayv2_route" "service" {
  for_each = var.services

  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "ANY /${each.value.route_prefix}/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.service[each.key].id}"
  authorization_type = each.value.authorization_type == "COGNITO" && var.issuer_url != "" ? "JWT" : "NONE"
  authorizer_id      = each.value.authorization_type == "COGNITO" && var.issuer_url != "" ? aws_apigatewayv2_authorizer.cognito[0].id : null
}

resource "aws_apigatewayv2_route" "service_root" {
  for_each = var.services

  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "ANY /${each.value.route_prefix}"
  target             = "integrations/${aws_apigatewayv2_integration.service[each.key].id}"
  authorization_type = each.value.authorization_type == "COGNITO" && var.issuer_url != "" ? "JWT" : "NONE"
  authorizer_id      = each.value.authorization_type == "COGNITO" && var.issuer_url != "" ? aws_apigatewayv2_authorizer.cognito[0].id : null
}

# --- OPTIONS preflight routes (no auth) for JWT-protected services ---
# Browsers never send Authorization in preflight; without these explicit routes
# the ANY route above intercepts OPTIONS and the JWT authorizer returns 401.

resource "aws_apigatewayv2_route" "service_options" {
  for_each = {
    for name, svc in var.services : name => svc
    if svc.authorization_type == "COGNITO"
  }

  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "OPTIONS /${each.value.route_prefix}/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.service[each.key].id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_route" "service_root_options" {
  for_each = {
    for name, svc in var.services : name => svc
    if svc.authorization_type == "COGNITO"
  }

  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "OPTIONS /${each.value.route_prefix}"
  target             = "integrations/${aws_apigatewayv2_integration.service[each.key].id}"
  authorization_type = "NONE"
}

# --- Logging ---

resource "aws_cloudwatch_log_group" "api" {
  name              = "custom/apigateway/${var.api_name}"
  retention_in_days = 30

  tags = var.tags
}

resource "aws_apigatewayv2_stage" "this" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId          = "$context.requestId"
      ip                 = "$context.identity.sourceIp"
      requestTime        = "$context.requestTime"
      httpMethod         = "$context.httpMethod"
      routeKey           = "$context.routeKey"
      status             = "$context.status"
      protocol           = "$context.protocol"
      responseLength     = "$context.responseLength"
      integrationError   = "$context.integration.error"
      integrationLatency = "$context.integration.latency"
    })
  }

  tags = var.tags
}