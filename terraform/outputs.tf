output "api_url" {
  description = "Public URL for the API — use this in Postman's AWS environment"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_push_commands" {
  description = "Commands to build and push images to ECR"
  value = <<-EOT
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=${var.aws_region}

    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

    docker build -t ${aws_ecr_repository.beer_service.repository_url}:latest -f beer-service/Dockerfile .
    docker push ${aws_ecr_repository.beer_service.repository_url}:latest

    docker build -t ${aws_ecr_repository.order_service.repository_url}:latest -f order-service/Dockerfile .
    docker push ${aws_ecr_repository.order_service.repository_url}:latest

    docker build -t ${aws_ecr_repository.gateway.repository_url}:latest -f gateway/Dockerfile .
    docker push ${aws_ecr_repository.gateway.repository_url}:latest
  EOT
}
