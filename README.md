# 🛒 FreshMart — Simple Online Grocery Store Web App

**FreshMart** is a clean, responsive online grocery store web application built with **HTML, CSS, and Vanilla JavaScript** (plus a Node.js/Express + MySQL backend) ready for deployment on **Ubuntu EC2 behind an AWS Application Load Balancer (ALB)**.

## ✨ Features

- **Grocery Catalog & Local Image Assets**: Browse 12 pre-loaded grocery items (`assets/images/*.svg`) across 5 categories (*Fruits & Vegetables*, *Dairy & Eggs*, *Bakery*, *Meat & Seafood*, *Pantry & Drinks*).
- **Shopping Cart & Promo Code**: Adjust item quantities, get free delivery on orders over `$35.00`, and apply discount code `FRESH10` for 10% off.
- **Checkout & Order History**: Place grocery delivery orders and view past order receipts in **📋 My Orders**.
- **Store Manager (`➕ Manage Store Products`)**: Add new grocery products (with image upload or URL) and manage inventory stock.
- **AWS ALB Health Check Ready**: Built-in `/health` and `/api/health` endpoints returning `HTTP 200 OK` along with the EC2 instance hostname.

---

## 🚀 Deploy on Private Ubuntu EC2 Behind AWS Application Load Balancer (ALB)

### Step 1: Run the Automated Setup Script on Your Ubuntu VM
Connect to your Ubuntu EC2 instance (e.g., via **AWS Systems Manager Session Manager**, **EC2 Instance Connect Endpoint**, or a **Bastion Host**; ensure outbound internet access via **NAT Gateway** so `apt` and `npm` can download packages) and run:

```bash
git clone <your-github-repository-url>
cd <your-repo-folder>
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

### Step 2: Configure Your AWS Application Load Balancer (ALB)
1. **Target Group Settings**:
   - **Target type**: `Instances`
   - **Protocol / Port**: `HTTP : 80` (or `HTTP : 3000`)
   - **Health Check Protocol**: `HTTP`
   - **Health Check Path**: `/health` (or `/`)
   - **Success codes**: `200`
2. **Security Group Rules**:
   - **ALB Security Group**: Allow Inbound `HTTP (80)` from `0.0.0.0/0`
   - **Ubuntu EC2 Security Group**: Allow Inbound `HTTP (80)` **only from the ALB Security Group** (no Public IP needed on the Ubuntu VM)
3. **Open Your Store**:
   - Visit your ALB DNS URL: `http://<your-alb-dns-name>.<region>.elb.amazonaws.com`
