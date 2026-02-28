module "ecr" {
  for_each = toset(var.repository_names)
  source   = "../../modules/ecr"

  repository_name  = each.key
  keep_tags_number = var.keep_tags_number
}

resource "aws_ssm_parameter" "ecr_repository_url" {
  for_each = toset(var.repository_names)

  name  = "/${var.project_name}/ecr/${each.key}/repository_url"
  type  = "String"
  value = module.ecr[each.key].repository_url
}
