/**
 * FreshMart Online Grocery Store - Node.js Server
 * Configured for Ubuntu EC2 behind an AWS Application Load Balancer (ALB) + Nginx.
 * Reports real-time RDS / MySQL connection telemetry while maintaining a seamless fallback mode.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err && err.message ? err.message : err);
});

function loadEnvFile() {
  try {
    require('dotenv').config();
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
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const DB_HOST = process.env.DB_HOST || process.env.RDS_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || process.env.RDS_PORT || 3306);
const DB_USER = process.env.DB_USER || process.env.RDS_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.RDS_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || process.env.RDS_DB_NAME || 'freshmart';

// In-memory fallback store when MySQL/RDS is not connected
let memoryProducts = [
  { id: 1, name: 'Organic Hass Avocados', category: 'Fruits & Vegetables', unit: 'Pack of 4 (approx. 700g)', price: 5.49, stock: 45, badge: 'Organic', image_url: 'assets/images/avocados.svg' },
  { id: 2, name: 'Sweet Cavendish Bananas', category: 'Fruits & Vegetables', unit: '1 kg Bunch', price: 1.99, stock: 80, badge: 'Best Seller', image_url: 'assets/images/bananas.svg' },
  { id: 3, name: 'Fresh Sweet Strawberries', category: 'Fruits & Vegetables', unit: '250g Punnet', price: 4.25, stock: 35, badge: 'Farm Fresh', image_url: 'assets/images/strawberries.svg' },
  { id: 4, name: 'Organic Baby Spinach', category: 'Fruits & Vegetables', unit: '200g Washed Bag', price: 2.89, stock: 50, badge: 'Organic', image_url: 'assets/images/spinach.svg' },
  { id: 5, name: 'Pasture-Raised Brown Eggs', category: 'Dairy & Eggs', unit: 'Dozen (12 Large Eggs)', price: 4.79, stock: 60, badge: 'Free Range', image_url: 'assets/images/eggs.svg' },
  { id: 6, name: 'Fresh Whole Cow Milk', category: 'Dairy & Eggs', unit: '1 Liter Bottle', price: 2.49, stock: 65, badge: 'Daily Fresh', image_url: 'assets/images/milk.svg' },
  { id: 7, name: 'Artisan Sourdough Loaf', category: 'Bakery', unit: '650g Freshly Baked', price: 4.99, stock: 22, badge: 'Baked Today', image_url: 'assets/images/sourdough.svg' },
  { id: 8, name: 'French Butter Croissants', category: 'Bakery', unit: 'Box of 4 Pastries', price: 5.99, stock: 28, badge: 'Popular', image_url: 'assets/images/croissants.svg' },
  { id: 9, name: 'Norwegian Atlantic Salmon Fillet', category: 'Meat & Seafood', unit: '400g Vacuum Pack', price: 12.99, stock: 18, badge: 'Wild Caught', image_url: 'assets/images/salmon.svg' },
  { id: 10, name: 'Grass-Fed Beef Ribeye Steak', category: 'Meat & Seafood', unit: '350g Cut', price: 14.50, stock: 15, badge: 'Prime Cut', image_url: 'assets/images/steak.svg' },
  { id: 11, name: 'Cold-Pressed Valencia Orange Juice', category: 'Pantry & Drinks', unit: '1 Liter Carafe', price: 4.50, stock: 40, badge: '100% Pure', image_url: 'assets/images/orange-juice.svg' },
  { id: 12, name: 'Extra Virgin Olive Oil', category: 'Pantry & Drinks', unit: '500ml Glass Bottle', price: 9.99, stock: 30, badge: 'Cold Pressed', image_url: 'assets/images/olive-oil.svg' }
];
let memoryOrders = [];

let dbPool = null;
let lastDbError = 'MySQL driver not initialized';

try {
  const mysql = require('mysql2/promise');
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
} catch (err) {
  lastDbError = err.message;
}

async function checkDbStatus() {
  if (!dbPool) {
    return { connected: false, error: lastDbError };
  }
  try {
    await dbPool.query('SELECT 1');
    lastDbError = null;
    return { connected: true, error: null };
  } catch (err) {
    lastDbError = err.code || err.message || 'Connection refused';
    return { connected: false, error: lastDbError };
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function startServer() {
  try {
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

    app.get(['/health', '/api/health'], async (req, res) => {
      const dbCheck = await checkDbStatus();
      res.status(200).json({
        status: 'healthy',
        instance_hostname: os.hostname(),
        database: dbCheck.connected ? 'connected' : 'standalone-fallback',
        db_connected: dbCheck.connected,
        db_host: DB_HOST,
        db_name: DB_NAME,
        db_error: dbCheck.error,
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/products', async (req, res) => {
      const dbCheck = await checkDbStatus();
      if (dbCheck.connected) {
        try {
          const [rows] = await dbPool.query('SELECT * FROM products ORDER BY id DESC');
          if (Array.isArray(rows) && rows.length > 0) {
            res.set('X-Data-Source', 'rds-mysql');
            return res.json(rows.map((r) => ({ ...r, data_source: 'rds' })));
          }
        } catch (err) {
          lastDbError = err.code || err.message;
        }
      }
      res.set('X-Data-Source', 'local-fallback');
      res.json(memoryProducts.map((r) => ({ ...r, data_source: 'fallback' })));
    });

    app.post('/api/products', async (req, res) => {
      const { name, category, unit, price, stock, badge, image_url } = req.body || {};
      const finalImageUrl = image_url || 'assets/images/avocados.svg';

      const dbCheck = await checkDbStatus();
      if (dbCheck.connected) {
        try {
          const [result] = await dbPool.query(
            'INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, category, unit || '1 Pack', Number(price), Number(stock), badge || 'Fresh', finalImageUrl]
          );
          return res.status(201).json({ id: result.insertId, image_url: finalImageUrl, data_source: 'rds' });
        } catch (err) {
          lastDbError = err.code || err.message;
        }
      }

      const newItem = {
        id: Date.now(),
        name: name || 'New Grocery Item',
        category: category || 'Fruits & Vegetables',
        unit: unit || '1 Pack',
        price: Number(price || 4.99),
        stock: Number(stock || 25),
        badge: badge || 'Fresh',
        image_url: finalImageUrl,
        data_source: 'fallback'
      };
      memoryProducts.unshift(newItem);
      res.status(201).json(newItem);
    });

    app.delete('/api/products/:id', async (req, res) => {
      const id = req.params.id;
      const dbCheck = await checkDbStatus();
      if (dbCheck.connected) {
        try {
          await dbPool.query('DELETE FROM products WHERE id = ?', [id]);
          return res.json({ deleted: true, data_source: 'rds' });
        } catch (err) {
          lastDbError = err.code || err.message;
        }
      }
      memoryProducts = memoryProducts.filter((p) => String(p.id) !== String(id));
      res.json({ deleted: true, data_source: 'fallback' });
    });

    app.get('/api/orders', async (req, res) => {
      const dbCheck = await checkDbStatus();
      if (dbCheck.connected) {
        try {
          const [rows] = await dbPool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
          return res.json(rows.map((r) => ({ ...r, data_source: 'rds' })));
        } catch (err) {
          lastDbError = err.code || err.message;
        }
      }
      res.json(memoryOrders.map((r) => ({ ...r, data_source: 'fallback' })));
    });

    app.post('/api/orders', async (req, res) => {
      const { customer_name, customer_phone, delivery_address, items_summary, total_amount } = req.body || {};
      const dbCheck = await checkDbStatus();
      if (dbCheck.connected) {
        try {
          const [result] = await dbPool.query(
            'INSERT INTO orders (customer_name, customer_phone, delivery_address, items_summary, total_amount) VALUES (?, ?, ?, ?, ?)',
            [customer_name, customer_phone, delivery_address, items_summary, Number(total_amount)]
          );
          return res.status(201).json({ id: result.insertId, data_source: 'rds' });
        } catch (err) {
          lastDbError = err.code || err.message;
        }
      }
      const newOrder = {
        id: Date.now().toString().slice(-5),
        customer_name,
        customer_phone,
        delivery_address,
        items_summary,
        total_amount: Number(total_amount || 0),
        data_source: 'fallback',
        created_at: new Date().toISOString()
      };
      memoryOrders.unshift(newOrder);
      res.status(201).json(newOrder);
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`FreshMart Express Server listening on http://0.0.0.0:${PORT}`);
    });
  } catch {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/health' || urlPath === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            status: 'healthy',
            instance_hostname: os.hostname(),
            database: 'standalone-fallback',
            db_connected: false,
            db_host: DB_HOST,
            db_name: DB_NAME,
            db_error: 'Running in built-in HTTP fallback mode'
          })
        );
      }
      if (urlPath === '/api/products' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(memoryProducts.map((r) => ({ ...r, data_source: 'fallback' }))));
      }
      if (urlPath === '/api/orders' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(memoryOrders));
      }

      const safeRelPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const filePath = path.join(__dirname, safeRelPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`FreshMart Built-in HTTP Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

