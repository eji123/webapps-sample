#!/usr/bin/env bash
# ==============================================================================
# FreshMart Grocery Store - Ubuntu EC2 Automated Setup & Run Script
# Supported OS: Ubuntu 20.04 / 22.04 / 24.04 LTS (Amazon EC2)
# Usage:
#   chmod +x setup-ubuntu.sh
#   ./setup-ubuntu.sh
# ==============================================================================

set -e

echo "============================================================"
echo "🛒 Starting FreshMart Grocery App Setup for Ubuntu EC2..."
echo "============================================================"

# 1. Update Ubuntu package index & install system dependencies
echo "📦 [1/6] Updating system packages and installing dependencies..."
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

# 3. Install PM2 Process Manager globally to keep the app running in background
echo "⚙️  [3/6] Installing PM2 process manager..."
sudo npm install -g pm2

# 4. Install Node.js application dependencies from package.json
echo "📚 [4/6] Installing application npm dependencies..."
npm install

# 5. Create .env file from .env.example if not already present
if [ ! -f .env ]; then
  echo "📝 [5/6] Creating default .env configuration file..."
  cp .env.example .env
fi

# Configure Nginx Reverse Proxy (Port 80 -> Port 3000) so http://<EC2-IP> works directly
echo "🌐 [5/6] Configuring Nginx reverse proxy on Port 80 -> Port 3000..."
sudo tee /etc/nginx/sites-available/freshmart >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/freshmart /etc/nginx/sites-enabled/freshmart
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# 6. Start (or restart) the FreshMart Express server using PM2
echo "🚀 [6/6] Starting FreshMart application with PM2..."
pm2 delete freshmart-app >/dev/null 2>&1 || true
pm2 start server.js --name "freshmart-app"
pm2 save

# Detect EC2 Public IPv4 (fallback to localhost if unavailable)
PUBLIC_IP=$(curl -s --max-time 3 http://checkip.amazonaws.com || echo "localhost")

echo ""
echo "============================================================"
echo "✅ FreshMart Grocery Store is LIVE!"
echo "------------------------------------------------------------"
echo "🌐 Open in browser (Port 80):   http://${PUBLIC_IP}"
echo "🌐 Direct Node port (Port 3000): http://${PUBLIC_IP}:3000"
echo "------------------------------------------------------------"
echo "💡 Useful PM2 Commands:"
echo "   pm2 status              # Check app status"
echo "   pm2 logs freshmart-app  # View server logs"
echo "   pm2 restart freshmart-app"
echo "============================================================"
