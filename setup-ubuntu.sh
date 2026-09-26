#!/usr/bin/env bash
# ==============================================================================
# FreshMart Grocery Store - Ubuntu EC2 Setup Script (Behind AWS ALB)
# Architecture: Client -> AWS Application Load Balancer (ALB) -> Ubuntu EC2 (Private IP)
# Supported OS: Ubuntu 20.04 / 22.04 / 24.04 LTS
# Usage:
#   chmod +x setup-ubuntu.sh
#   ./setup-ubuntu.sh
# ==============================================================================

set -e

echo "===================================================================="
echo "🛒 Starting FreshMart Grocery Setup (Ubuntu EC2 behind AWS ALB)..."
echo "===================================================================="

# 1. Update Ubuntu package index & install required system packages
echo "📦 [1/6] Updating Ubuntu packages and installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl git unzip build-essential mysql-client nginx

# 2. Install Node.js 20 LTS & npm (if not installed)
if ! command -v node >/dev/null 2>&1; then
  echo "🟢 [2/6] Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "🟢 [2/6] Node.js is already installed ($(node -v))."
fi

# 3. Install PM2 Process Manager globally
echo "⚙️  [3/6] Installing PM2 process manager..."
sudo npm install -g pm2

# 4. Install Node.js application dependencies from package.json
echo "📚 [4/6] Installing application npm dependencies..."
npm install

# Create .env from .env.example if .env does not exist
if [ ! -f .env ]; then
  echo "📝 Creating .env configuration file from .env.example..."
  cp .env.example .env
fi

# 5. Configure Nginx on Port 80 for AWS Application Load Balancer (ALB) traffic
echo "🌐 [5/6] Configuring Nginx for AWS Application Load Balancer (Port 80 -> 3000)..."
sudo tee /etc/nginx/sites-available/freshmart >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 20M;

    # Dedicated fast health check endpoint for AWS ALB Target Group
    location = /alb-health {
        access_log off;
        add_header Content-Type application/json;
        return 200 '{"status":"healthy","proxy":"nginx"}';
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Forward AWS ALB client headers to Node.js
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/freshmart /etc/nginx/sites-enabled/freshmart
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# 6. Start the FreshMart application with PM2 & enable auto-start on VM reboot
echo "🚀 [6/6] Starting FreshMart application with PM2..."
pm2 delete freshmart-app >/dev/null 2>&1 || true
pm2 start server.js --name "freshmart-app"
pm2 save

# Register PM2 with systemd so the app auto-starts if the private EC2 instance reboots
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1 || true
pm2 save >/dev/null 2>&1 || true

# Query EC2 Instance Metadata (IMDSv2) for Private IP, Instance ID, and AZ (No Public IP needed)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" --max-time 2 || true)
if [ -n "$TOKEN" ]; then
  PRIVATE_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/local-ipv4 --max-time 2)
  INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id --max-time 2)
  AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone --max-time 2)
else
  PRIVATE_IP=$(hostname -I | awk '{print $1}')
  INSTANCE_ID="local-ubuntu-vm"
  AZ="vpc-private-subnet"
fi

# Verify local ALB health check endpoint
sleep 1
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/health || echo "000")

echo ""
echo "===================================================================="
echo "✅ FreshMart Node is READY for AWS Application Load Balancer (ALB)!"
echo "--------------------------------------------------------------------"
echo "🖥️  EC2 Instance ID:          ${INSTANCE_ID}"
echo "📍 Availability Zone:        ${AZ}"
echo "🔒 VM Private IPv4 Address:  ${PRIVATE_IP} (Listening on Port 80 & 3000)"
echo "🩺 Local Health Check (/health): HTTP ${HEALTH_CODE}"
echo "--------------------------------------------------------------------"
echo "⚖️  AWS ALB Target Group Configuration:"
echo "   • Target Protocol / Port: HTTP : 80"
echo "   • Health Check Path:      /health   (or /)"
echo "   • Security Group Rule:    Allow Inbound TCP Port 80 from ALB Security Group"
echo "--------------------------------------------------------------------"
echo "🌐 Access your store in browser via your ALB DNS Name:"
echo "   http://<YOUR-ALB-DNS-NAME>.elb.amazonaws.com"
echo "===================================================================="
