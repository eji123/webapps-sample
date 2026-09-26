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

# 2. Install Node.js & npm (if not installed) - Supports Ubuntu 20.04 / 22.04 / 24.04 / 26.04
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "🟢 [2/6] Installing Node.js & npm..."
  if curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; then
    sudo apt-get install -y nodejs
  else
    sudo apt-get install -y nodejs npm
  fi
  if ! command -v npm >/dev/null 2>&1; then
    sudo apt-get install -y npm
  fi
else
  echo "🟢 [2/6] Node.js ($(node -v)) & npm ($(npm -v)) are already installed."
fi

# 3. Install PM2 Process Manager globally
echo "⚙️  [3/6] Installing PM2 process manager..."
sudo npm install -g pm2

# 4. Ensure package.json is valid (not empty) & install application dependencies
if [ ! -s package.json ]; then
  echo "⚠️  package.json is empty or missing. Generating default package.json..."
  cat > package.json <<'EOF'
{
  "name": "freshmart-grocery-webapp",
  "version": "1.0.0",
  "description": "FreshMart Online Grocery Store Web Application (Node.js/Express + MySQL + AWS ALB)",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.540.0",
    "@aws-sdk/s3-request-presigner": "^3.540.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^3.9.7"
  }
}
EOF
fi

echo "📚 [4/6] Installing application npm dependencies..."
npm install

# Create .env from .env.example if .env does not exist or is empty
if [ ! -s .env ]; then
  echo "📝 Creating default .env configuration file..."
  if [ -s .env.example ]; then
    cp .env.example .env
  else
    cat > .env <<'EOF'
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=freshmart
AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=
EOF
  fi
fi

# Upload local assets/images/* to Amazon S3 if S3_BUCKET_NAME is set in .env
S3_BUCKET_VAL=$(grep -E '^S3_BUCKET_NAME=' .env | cut -d '=' -f2- | tr -d '\r"'\'' ' || true)
AWS_REGION_VAL=$(grep -E '^AWS_REGION=' .env | cut -d '=' -f2- | tr -d '\r"'\'' ' || echo "ap-southeast-1")
if [ -n "$S3_BUCKET_VAL" ]; then
  echo "☁️  Uploading local assets/images/* to Private S3 Bucket (s3://${S3_BUCKET_VAL}/assets/images/)..."
  node -e '
    const fs = require("fs");
    const path = require("path");
    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    const bucket = process.argv[1];
    const region = process.argv[2] || "ap-southeast-1";
    const s3 = new S3Client({ region });
    const dir = path.join(__dirname, "assets", "images");
    (async () => {
      const files = fs.readdirSync(dir).filter(f => /\.(svg|png|jpg|jpeg)$/i.test(f));
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const type = ext === ".svg" ? "image/svg+xml" : ext === ".png" ? "image/png" : "image/jpeg";
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: `assets/images/${file}`,
          Body: fs.readFileSync(path.join(dir, file)),
          ContentType: type
        }));
        console.log(`   ✔ Uploaded s3://${bucket}/assets/images/${file}`);
      }
    })().catch(e => console.warn("   ⚠️ S3 upload skipped/failed:", e.message));
  ' "$S3_BUCKET_VAL" "$AWS_REGION_VAL"
else
  echo "ℹ️  S3_BUCKET_NAME in .env is empty — skipping S3 asset upload for now."
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
