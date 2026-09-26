# 🛒 FreshMart — Simple Online Grocery Store Web App

**FreshMart** is a clean, responsive online grocery store web application built with **HTML, CSS, and Vanilla JavaScript** (plus a Node.js/Express + MySQL backend).

## ✨ Features

- **Grocery Catalog & Filtering**: Browse 12 pre-loaded grocery items across 5 categories (*Fruits & Vegetables*, *Dairy & Eggs*, *Bakery*, *Meat & Seafood*, *Pantry & Drinks*).
- **Live Search & Sorting**: Search items by name/category and sort by price or alphabetical order.
- **Shopping Cart & Promo Code**: Adjust item quantities, get free delivery on orders over `$35.00`, and apply discount code `FRESH10` for 10% off.
- **Checkout & Order History**: Place grocery delivery orders and view past order receipts in **📋 My Orders**.
- **Store Manager (`➕ Manage Store Products`)**: Add new grocery products (with image upload or URL) and manage inventory stock.

---

## 🚀 Deploy on Ubuntu EC2 (1-Script Automated Setup)

After launching an **Ubuntu 22.04 / 24.04 LTS** EC2 instance (with HTTP Port `80` and `3000` allowed in your Security Group), SSH into your server and run:

```bash
git clone <your-github-repository-url>
cd <your-repo-folder>
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

### What `setup-ubuntu.sh` Installs & Configures Automatically:
1. **Ubuntu System Packages**: `curl`, `git`, `unzip`, `build-essential`, `mysql-client`, `nginx`
2. **Node.js 20 LTS & npm**: Installs the Node.js runtime via NodeSource
3. **PM2 Process Manager**: Keeps the app running continuously in the background
4. **App Dependencies (`npm install`)**: Installs `express`, `cors`, `dotenv`, `multer`, `mysql2`, and `@aws-sdk/client-s3`
5. **Nginx Reverse Proxy**: Forwards Port `80` (`http://<EC2-PUBLIC-IP>`) to Node.js Port `3000`
6. **Starts the Server**: Launches `server.js` under PM2 (`freshmart-app`) and prints the live URL

---

## 💻 Local Quick Start (Zero Dependencies)

You can also open `index.html` directly in any browser without a server—all products, cart items, and orders persist automatically in `localStorage`.
