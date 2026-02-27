#!/bin/bash
# Redirect stdout/stderr to a log file and the system console
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting user data script execution"

echo "Updating system packages..."
apt update
apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
echo "Package update complete."

# Docker Install
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
newgrp docker
usermod -aG docker $INSTANCE_USER
systemctl enable docker
systemctl start docker
echo "Docker installation complete."

# ECS Agent Install
echo "Installing ECS Service..."
curl -O https://s3.us-east-1.amazonaws.com/amazon-ecs-agent-us-east-1/amazon-ecs-init-latest.amd64.deb
dpkg -i amazon-ecs-init-latest.amd64.deb
echo ECS_CLUSTER=${cluster_name} >> /etc/ecs/ecs.config

# Ensure ECS starts after cloud-init is complete
systemctl daemon-reexec
systemctl daemon-reload
systemctl enable ecs
systemctl start ecs
