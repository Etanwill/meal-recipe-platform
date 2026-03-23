#!/bin/bash
# ===========================================
# Meal Recipe Platform - VPS Setup Script
# Run this on your Ubuntu server (Render/Oracle)
# ===========================================

echo "=========================================="
echo " Meal Recipe Platform - Server Setup"
echo "=========================================="

# Update system packages
echo "[1/7] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# Install Docker
echo "[2/7] Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group (no sudo needed)
sudo usermod -aG docker $USER

# Install Docker Compose standalone
echo "[3/7] Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
echo "[4/7] Installing Git..."
sudo apt-get install -y git

# Install Nginx (as host-level reverse proxy)
echo "[5/7] Installing Nginx..."
sudo apt-get install -y nginx

# Configure Firewall
echo "[6/7] Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 5000/tcp   # Flask API
sudo ufw allow 3001/tcp   # Grafana
sudo ufw allow 9090/tcp   # Prometheus
sudo ufw --force enable

# Clone the project
echo "[7/7] Cloning the project..."
git clone https://github.com/Etanwill/meal-recipe-platform.git /opt/meal-recipe-platform
cd /opt/meal-recipe-platform

echo ""
echo "=========================================="
echo " Setup Complete!"
echo " Next: cd /opt/meal-recipe-platform"
echo "       docker-compose up -d"
echo "=========================================="
