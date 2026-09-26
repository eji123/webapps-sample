/**
 * FreshMart Online Grocery Store - Node.js Server
 * Architecture: AWS ALB -> Ubuntu EC2 (Nginx + Node.js) -> Amazon RDS (MySQL) + Private Amazon S3 (Pre-Signed URLs)
 * - Grocery Catalog (/api/products) & Orders (/api/orders) strictly require an active MySQL / RDS connection.
 * - All product images & assets are stored in a Private S3 Bucket (Block Public Access: ON) and served via S3 Pre-Signed URLs.
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

const AWS_REGION = (process.env.AWS_REGION || 'ap-southeast-1').trim();
const S3_BUCKET = (process.env.S3_BUCKET_NAME || '').trim();
const PRESIGNED_EXPIRES_SECONDS = 900; // 15 minutes

let s3Client = null;
let PutObjectCommand = null;
let GetObjectCommand = null;
let getSignedUrl = null;

try {
  const s3Sdk = require('@aws-sdk/client-s3');
  const presigner = require('@aws-sdk/s3-request-presigner');
  PutObjectCommand = s3Sdk.PutObjectCommand;
  GetObjectCommand = s3Sdk.GetObjectCommand;
  getSignedUrl = presigner.getSignedUrl;

  if (S3_BUCKET) {
    s3Client = new s3Sdk.S3Client({ region: AWS_REGION });
  }
} catch (err) {
  console.warn('[Warning] AWS S3 SDK / Presigner not loaded:', err.message);
}

// Extract the S3 Object Key (e.g. "assets/images/avocados.svg") from a stored path or S3 URL
function extractS3Key(imagePath) {
  if (!imagePath) return 'assets/images/avocados.svg';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const urlObj = new URL(imagePath);
      return urlObj.pathname.replace(/^\/+/, '');
    } catch {
      return 'assets/images/avocados.svg';
    }
  }
  return imagePath.replace(/^\/+/, '');
}

// Generate an Amazon S3 Pre-Signed URL (works with Private S3 Bucket / Block All Public Access: ON)
async function resolvePresignedImageUrl(imagePath) {
  const s3Key = extractS3Key(imagePath);

  if (!S3_BUCKET || !s3Client || !GetObjectCommand || !getSignedUrl) {
    return `https://s3-bucket-not-configured.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    });
    return await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_EXPIRES_SECONDS });
  } catch (err) {
    console.warn(`[S3 Presign Error] Could not sign ${s3Key}: ${err.message}`);
    return `https://s3-credentials-unavailable.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;
  }
}

// Automatically upload local assets/images/*.svg files to the Private S3 Bucket on startup
async function syncLocalAssetsToS3() {
  if (!s3Client || !S3_BUCKET || !PutObjectCommand) return;
  const imagesDir = path.join(__dirname, 'assets', 'images');
  if (!fs.existsSync(imagesDir)) return;

  const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith('.svg') || f.endsWith('.png') || f.endsWith('.jpg'));
  console.log(`[S3 Sync] Uploading ${files.length} asset images to Private Bucket s3://${S3_BUCKET}/assets/images/...`);

  for (const file of files) {
    try {
      const filePath = path.join(imagesDir, file);
      const body = fs.readFileSync(filePath);
      const ext = path.extname(file).toLowerCase();
      const contentType = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg';

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: `assets/images/${file}`,
          Body: body,
          ContentType: contentType
        })
      );
    } catch (err) {
      console.warn(`[S3 Sync Warning] Could not upload ${file} to S3: ${err.message}`);
      return;
    }
  }
  console.log(`[S3 Sync] Successfully synced all images to Private Bucket s3://${S3_BUCKET}/assets/images/`);
}

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

async function ensureDatabaseAndTables() {
  if (!mysql || !DB_HOST) {
    throw new Error('DB_HOST is not configured in .env');
  }

  if (schemaInitialized && dbPool) {
    await dbPool.query('SELECT 1');
    return dbPool;
  }

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
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.set('trust proxy', true);

try {
  const cors = require('cors');
  app.use(cors());
} catch {
  // Optional cors
}

app.use(express.json({ limit: '10mb' }));

// Route all /assets/images/* requests (such as the Hero Banner image) through Private S3 Pre-Signed URLs
app.get('/assets/images/:filename', async (req, res) => {
  if (!S3_BUCKET || !s3Client) {
    return res.status(404).send('S3_BUCKET_NAME is not configured');
  }
  const presignedUrl = await resolvePresignedImageUrl(`assets/images/${req.params.filename}`);
  res.redirect(302, presignedUrl);
});

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
    s3_bucket: S3_BUCKET || 'not-configured',
    s3_mode: 'private-presigned-url',
    s3_region: AWS_REGION,
    timestamp: new Date().toISOString()
  });
});

// GET /api/products — Strictly from RDS; generates Private S3 Pre-Signed URLs for every product image
app.get('/api/products', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id ASC');

    const mapped = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        image_url: await resolvePresignedImageUrl(row.image_url)
      }))
    );

    res.json(mapped);
  } catch (err) {
    res.status(503).json({
      error: 'Database connection unavailable',
      details: err.message,
      products: []
    });
  }
});

// POST /api/products — Uploads new product image to Private S3 Bucket and stores S3 key in RDS
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    const { name, category, unit, price, stock, badge, image_url } = req.body || {};
    let storedS3Key = extractS3Key(image_url || 'assets/images/avocados.svg');

    if (req.file && s3Client && S3_BUCKET && PutObjectCommand) {
      const ext = path.extname(req.file.originalname) || '.png';
      storedS3Key = `assets/images/${Date.now()}-${(name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}${ext}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: storedS3Key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || 'image/png'
        })
      );
    }

    const [result] = await pool.query(
      'INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, unit || '1 Pack', Number(price), Number(stock), badge || 'Fresh', storedS3Key]
    );

    const signedUrl = await resolvePresignedImageUrl(storedS3Key);
    res.status(201).json({ id: result.insertId, image_url: signedUrl });
  } catch (err) {
    res.status(503).json({ error: 'Failed to add product: ' + err.message });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(503).json({ error: 'Database connection unavailable: ' + err.message });
  }
});

// POST /api/products/reset
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

// GET /api/orders
app.get('/api/orders', async (req, res) => {
  try {
    const pool = await ensureDatabaseAndTables();
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) {
    res.status(503).json({ error: 'Database connection unavailable', orders: [] });
  }
});

// POST /api/orders
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
  syncLocalAssetsToS3();
});
