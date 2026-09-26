/**
 * CloudMart - Optional Node.js Express Backend for Amazon EC2
 * Connects the static frontend (index.html, app.js) to:
 *   1. Amazon RDS (MySQL) for products & orders
 *   2. Amazon S3 for uploading & serving product images
 * FreshMart Online Grocery Store - Node.js Express Server
 * Serves the static web app (index.html, styles.css, app.js) and provides
 * REST endpoints (/api/products, /api/orders) for database & image storage.
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configure Multer in-memory storage for S3 upload forwarding
const upload = multer({ storage: multer.memoryStorage() });

// Configure AWS S3 Client (Uses EC2 IAM Role automatically if credentials are omitted)
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'cloudmart-assets-demo';
const s3Client = new S3Client({ region: AWS_REGION });
const S3_BUCKET = process.env.S3_BUCKET_NAME || '';
const s3Client = S3_BUCKET ? new S3Client({ region: AWS_REGION }) : null;

// Configure Amazon RDS MySQL Connection Pool
const dbPool = mysql.createPool({
  host: process.env.RDS_HOST || 'localhost',
  port: Number(process.env.RDS_PORT || 3306),
  user: process.env.RDS_USER || 'admin',
  password: process.env.RDS_PASSWORD || '',
  database: process.env.RDS_DB_NAME || 'cloudmart',
  host: process.env.DB_HOST || process.env.RDS_HOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.RDS_PORT || 3306),
  user: process.env.DB_USER || process.env.RDS_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD || '',
  database: process.env.DB_NAME || process.env.RDS_DB_NAME || 'freshmart',
  waitForConnections: true,
  connectionLimit: 10
});

// Health Check Endpoint (EC2 Load Balancer / Status Check)
app.get('/api/health', async (req, res) => {
  try {
    await dbPool.query('SELECT 1');
    res.json({
      status: 'healthy',
      ec2: 'online',
      rds: 'connected',
      s3_bucket: S3_BUCKET,
      region: AWS_REGION
    });
  } catch (err) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// GET /api/products - Fetch all products from RDS
// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products - Upload image to S3 & insert product record into RDS
// POST /api/products
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, stock, description, image_url } = req.body;
    let s3Key = `products/${Date.now()}-${(name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    let finalImageUrl = image_url || '';
    const { name, category, unit, price, stock, badge, image_url } = req.body;
    let finalImageUrl = image_url || 'https://placehold.co/480x320/16a34a/ffffff?text=Fresh+Grocery';

    if (req.file) {
    if (req.file && s3Client && S3_BUCKET) {
      const ext = path.extname(req.file.originalname) || '.png';
      s3Key = `${s3Key}${ext}`;
      const key = `groceries/${Date.now()}-${(name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}${ext}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype
        })
      );

      finalImageUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;
      finalImageUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    }

    const [result] = await dbPool.query(
      'INSERT INTO products (name, category, price, stock, s3_key, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, Number(price), Number(stock), s3Key, finalImageUrl, description]
      'INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, unit || '1 Pack', Number(price), Number(stock), badge || 'Fresh', finalImageUrl]
    );

    res.status(201).json({ id: result.insertId, s3_key: s3Key, image_url: finalImageUrl });
    res.status(201).json({ id: result.insertId, image_url: finalImageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id - Delete object from S3 & row from RDS
// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT s3_key FROM products WHERE id = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].s3_key) {
      await s3Client
        .send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: rows[0].s3_key }))
        .catch(() => {});
    }
    await dbPool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders - Fetch orders from RDS
// GET /api/orders
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders - Create order in RDS & update product stock
// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const conn = await dbPool.getConnection();
  try {
    const { customer_name, customer_email, items, total_amount } = req.body;
    const itemsSummary = (items || []).map((i) => `${i.qty}x ${i.name}`).join(', ');

    await conn.beginTransaction();

    const [orderRes] = await conn.query(
      'INSERT INTO orders (customer_name, customer_email, items_summary, total_amount) VALUES (?, ?, ?, ?)',
      [customer_name, customer_email, itemsSummary, Number(total_amount)]
    const { customer_name, customer_phone, delivery_address, items_summary, total_amount } = req.body;
    const [result] = await dbPool.query(
      'INSERT INTO orders (customer_name, customer_phone, delivery_address, items_summary, total_amount) VALUES (?, ?, ?, ?, ?)',
      [customer_name, customer_phone, delivery_address, items_summary, Number(total_amount)]
    );

    for (const item of items || []) {
      await conn.query('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [
        Number(item.qty),
        Number(item.id)
      ]);
    }

    await conn.commit();
    res.status(201).json({ id: orderRes.insertId });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.listen(PORT, () => {
  console.log(`CloudMart EC2 Server running at http://0.0.0.0:${PORT}`);
  console.log(`FreshMart Grocery Store running at http://localhost:${PORT}`);
});

