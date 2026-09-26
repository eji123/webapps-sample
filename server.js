/**
 * FreshMart Online Grocery Store - Node.js Server
 * Configured for Ubuntu EC2 behind an AWS Application Load Balancer (ALB) + Nginx.
 * - Website UI (HTML/CSS/JS) & /health always respond on Port 3000 (Never 502 Bad Gateway).
 * - Grocery Catalog (/api/products) & Orders (/api/orders) strictly require an active MySQL / RDS connection.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err && err.message ? err.message : err);
});

function loadEnvFile() {
  try {
    require('dotenv').config({ override: true });
  } catch {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const DB_HOST = (process.env.DB_HOST || process.env.RDS_HOST || '').trim();
const DB_PORT = Number(process.env.DB_PORT || process.env.RDS_PORT || 3306);
const DB_USER = (process.env.DB_USER || process.env.RDS_USER || 'root').trim();
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.RDS_PASSWORD || '';
const DB_NAME = (process.env.DB_NAME || process.env.RDS_DB_NAME || 'freshmart').trim();

const SEED_GROCERIES = [
  ['Organic Hass Avocados', 'Fruits & Vegetables', 'Pack of 4 (approx. 700g)', 5.49, 45, 'Organic', 'assets/images/avocados.svg'],
  ['Sweet Cavendish Bananas', 'Fruits & Vegetables', '1 kg Bunch', 1.99, 80, 'Best Seller', 'assets/images/bananas.svg'],
  ['Fresh Sweet Strawberries', 'Fruits & Vegetables', '250g Punnet', 4.25, 35, 'Farm Fresh', 'assets/images/strawberries.svg'],
  ['Organic Baby Spinach', 'Fruits & Vegetables', '200g Washed Bag', 2.89, 50, 'Organic', 'assets/images/spinach.svg'],
  ['Pasture-Raised Brown Eggs', 'Dairy & Eggs', 'Dozen (12 Large Eggs)', 4.79, 60, 'Free Range', 'assets/images/eggs.svg'],
  ['Fresh Whole Cow Milk', 'Dairy & Eggs', '1 Liter Bottle', 2.49, 65, 'Daily Fresh', 'assets/images/milk.svg'],
  ['Artisan Sourdough Loaf', 'Bakery', '650g Freshly Baked', 4.99, 22, 'Baked Today', 'assets/images/sourdough.svg'],
  ['French Butter Croissants', 'Bakery', 'Box of 4 Pastries', 5.99, 28, 'Popular', 'assets/images/croissants.svg'],
  ['Norwegian Atlantic Salmon Fillet', 'Meat & Seafood', '400g Vacuum Pack', 12.99, 18, 'Wild Caught', 'assets/images/salmon.svg'],
  ['Grass-Fed Beef Ribeye Steak', 'Meat & Seafood', '350g Cut', 14.50, 15, 'Prime Cut', 'assets/images/steak.svg'],
  ['Cold-Pressed Valencia Orange Juice', 'Pantry & Drinks', '1 Liter Carafe', 4.50, 40, '100% Pure', 'assets/images/orange-juice.svg'],
  ['Extra Virgin Olive Oil', 'Pantry & Drinks', '500ml Glass Bottle', 9.99, 30, 'Cold Pressed', 'assets/images/olive-oil.svg']
];

let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch {
  console.warn('[Warning] mysql2 module not installed.');
}

let dbPool = null;
let schemaInitialized = false;

function getPool() {
  if (!mysql || !DB_HOST) return null;
  if (!dbPool) {
    dbPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 3000
    });
  }
  return dbPool;
}

// Automatically create database, tables, and seed 12 groceries when RDS is reachable
async function ensureDatabaseAndTables() {
  if (!mysql || !DB_HOST) {
    throw new Error('DB_HOST is not configured in .env');
  }

  if (schemaInitialized && dbPool) {
    await dbPool.query('SELECT 1');
    return dbPool;
  }

  // Connect without database name first in case 'freshmart' DB hasn't been created on RDS yet
  const bootstrapConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    connectTimeout: 3000
  });

  await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await bootstrapConn.end();

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(80) NOT NULL,
      unit VARCHAR(80) DEFAULT '1 Pack',
      price DECIMAL(10, 2) NOT NULL,
      stock INT NOT NULL DEFAULT 25,
      badge VARCHAR(50) DEFAULT 'Fresh',
      image_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(120) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      delivery_address TEXT NOT NULL,
      items_summary TEXT NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM products');
  if (countRows[0].cnt === 0) {
    await pool.query(
      'INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES ?',
      [SEED_GROCERIES]
    );
  }

  schemaInitialized = true;
  return pool;
}

const express = require('express');
const app = express();
app.set('trust proxy', true);

try {
  const cors = require('cors');
  app.use(cors());
} catch {
  // Optional cors
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// AWS ALB Health Check (Always returns 200 OK so EC2 Target Group stays Healthy)
app.get(['/health', '/api/health'], async (req, res) => {
  let dbConnected = false;
  try {
    await ensureDatabaseAndTables();
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  res.status(200).json({
    status: 'healthy',
    instance_hostname: os.hostname(),
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// GET /api/products — Only returns grocery list when connected to RDS/MySQL
app.get('/api/products', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(503).json({
      error: 'Database connection unavailable',
      details: err.message,
      products: []
    });
  }
});

// POST /api/products — Requires RDS/MySQL
app.post('/api/products', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    const { name, category, unit, price, stock, badge, image_url } = req.body || {};
    const finalImageUrl = image_url || 'assets/images/avocados.svg';

    const [result] = await pool.query(
      'INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, unit || '1 Pack', Number(price), Number(stock), badge || 'Fresh', finalImageUrl]
    );
    res.status(201).json({ id: result.insertId, image_url: finalImageUrl });
  } catch (err) {
    res.status(503).json({ error: 'Database connection unavailable: ' + err.message });
  }
});

// DELETE /api/products/:id — Requires RDS/MySQL
app.delete('/api/products/:id', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(503).json({ error: 'Database connection unavailable: ' + err.message });
  }
});

// POST /api/products/reset — Restores the 12 default groceries in RDS
app.post('/api/products/reset', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    await pool.query('DELETE FROM products');
    await pool.query(
      'INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES ?',
      [SEED_GROCERIES]
    );
    res.json({ reset: true });
  } catch (err) {
    res.status(503).json({ error: 'Database connection unavailable: ' + err.message });
  }
});

// GET /api/orders — Requires RDS/MySQL
app.get('/api/orders', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Database connection unavailable', orders: [] });
  }
});

// POST /api/orders — Requires RDS/MySQL
app.post('/api/orders', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    const { customer_name, customer_phone, delivery_address, items_summary, total_amount } = req.body || {};
    const [result] = await pool.query(
      'INSERT INTO orders (customer_name, customer_phone, delivery_address, items_summary, total_amount) VALUES (?, ?, ?, ?, ?)',
      [customer_name, customer_phone, delivery_address, items_summary, Number(total_amount)]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(503).json({ error: 'Database connection unavailable: ' + err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FreshMart Grocery Server listening on http://0.0.0.0:${PORT}`);
});
