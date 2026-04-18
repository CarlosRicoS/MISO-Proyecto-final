#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting web app instance setup"

echo "Updating system packages..."
apt update
apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    awscli
echo "Package update complete."

echo "Installing SSM agent..."
snap install amazon-ssm-agent --classic
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
echo "SSM agent installation complete."

echo "Installing Docker..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
echo "Docker installation complete."

echo "Authenticating with ECR..."
aws ecr get-login-password --region ${aws_region} | \
  docker login --username AWS --password-stdin ${ecr_repository_url}

echo "Fetching API Gateway URL from SSM..."
API_BASE_URL=$(aws ssm get-parameter \
  --name "${api_gateway_ssm_path}" \
  --region ${aws_region} \
  --query 'Parameter.Value' --output text)
echo "API_BASE_URL=$API_BASE_URL"

echo "Starting web app container..."
docker run -d \
  --name ${container_name} \
  --restart always \
  -p 80:80 \
  -e API_BASE_URL="$API_BASE_URL" \
  ${ecr_repository_url}:${image_tag}

echo "Web app started."
