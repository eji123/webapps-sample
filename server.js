/**
 * FreshMart Online Grocery Store - Node.js Express Server
 * Configured for Ubuntu EC2 behind an AWS Application Load Balancer (ALB).
 */

require('dotenv').config();
const os = require('os');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust AWS Application Load Balancer (ALB) & Nginx reverse proxy headers (X-Forwarded-For / X-Forwarded-Proto)
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const upload = multer({ storage: multer.memoryStorage() });

const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || '';
const s3Client = S3_BUCKET ? new S3Client({ region: AWS_REGION }) : null;

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || process.env.RDS_HOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.RDS_PORT || 3306),
  user: process.env.DB_USER || process.env.RDS_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD || '',
  database: process.env.DB_NAME || process.env.RDS_DB_NAME || 'freshmart',
  waitForConnections: true,
  connectionLimit: 10
});

// AWS ALB Target Group Health Check Endpoints (Always returns HTTP 200 OK when server is up)
app.get(['/health', '/api/health'], async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await dbPool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'standalone-localstorage-fallback';
  }

  res.status(200).json({
    status: 'healthy',
    instance_hostname: os.hostname(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, category, unit, price, stock, badge, image_url } = req.body;
    let finalImageUrl = image_url || 'assets/images/avocados.svg';

    if (req.file && s3Client && S3_BUCKET) {
      const ext = path.extname(req.file.originalname) || '.png';
      const key = `groceries/${Date.now()}-${(name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}${ext}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype
        })
      );
      finalImageUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    }

    const [result] = await dbPool.query(
      'INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, unit || '1 Pack', Number(price), Number(stock), badge || 'Fresh', finalImageUrl]
    );

    res.status(201).json({ id: result.insertId, image_url: finalImageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    await dbPool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, customer_phone, delivery_address, items_summary, total_amount } = req.body;
    const [result] = await dbPool.query(
      'INSERT INTO orders (customer_name, customer_phone, delivery_address, items_summary, total_amount) VALUES (?, ?, ?, ?, ?)',
      [customer_name, customer_phone, delivery_address, items_summary, Number(total_amount)]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FreshMart Grocery Server listening on http://0.0.0.0:${PORT}`);
});
