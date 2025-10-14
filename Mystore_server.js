// server.js — single-file Node.js backend (MySQL + JWT auth + file uploads)
// Save this file and run: node server.js  (or npm run dev with nodemon)

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// ensure upload dir
(async () => {
  try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); } catch (e) { console.error(e); }
})();

// multer: store images in uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|bmp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'treasury_of_flair',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// helper: run query
async function q(sql, params=[]) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// auto-create tables if not exists
async function ensureTables() {
  await q(`
    CREATE TABLE IF NOT EXISTS sellers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NULL,
      uuid CHAR(36) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT 'uncategorized',
      price DECIMAL(10,2) DEFAULT 0.00,
      status ENUM('active','sold','draft') DEFAULT 'active',
      image VARCHAR(512) NULL,
      views INT DEFAULT 0,
      likes INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

ensureTables().catch(err => {
  console.error('Error ensuring tables:', err);
  process.exit(1);
});

// middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR)); // serve images

// auth helpers
function generateToken(seller) {
  return jwt.sign({ id: seller.id, email: seller.email, name: seller.name }, JWT_SECRET, { expiresIn: '7d' });
}

async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // load seller from DB to ensure still exists
    const rows = await q('SELECT id, name, email FROM sellers WHERE id = ? LIMIT 1', [payload.id]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid token (seller not found)' });
    req.seller = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ------------------ AUTH ROUTES ------------------

// Register seller
// POST /auth/register { name, email, password }
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'name, email, password required' });

    // check existing
    const exists = await q('SELECT id FROM sellers WHERE email = ? LIMIT 1', [email]);
    if (exists.length) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await q('INSERT INTO sellers (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
    const seller = (await q('SELECT id, name, email FROM sellers WHERE id = ?', [result.insertId]))[0];
    const token = generateToken(seller);
    res.status(201).json({ seller, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login seller
// POST /auth/login { email, password }
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email, password required' });

    const rows = await q('SELECT id, name, email, password_hash FROM sellers WHERE email = ? LIMIT 1', [email]);
    if (!rows.length) return res.status(400).json({ message: 'Invalid credentials' });
    const seller = rows[0];
    const ok = await bcrypt.compare(password, seller.password_hash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken({ id: seller.id, name: seller.name, email: seller.email });
    res.json({ seller: { id: seller.id, name: seller.name, email: seller.email }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// ------------------ PRODUCT ROUTES ------------------

// Public: list/search products
// GET /api/products?search=&category=&status=&sort=&page=&limit=
app.get('/api/products', async (req, res) => {
  try {
    const { search = '', category = 'all', status = 'active', sort = 'newest', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(Number(page),1) - 1) * Number(limit);
    const where = [];
    const params = [];

    if (search) {
      where.push('(p.title LIKE ? OR p.category LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
      where.push('p.category = ?'); params.push(category);
    }
    if (status && status !== 'all') {
      where.push('p.status = ?'); params.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let orderBy = 'p.created_at DESC';
    switch (sort) {
      case 'oldest': orderBy = 'p.created_at ASC'; break;
      case 'price-high': orderBy = 'p.price DESC'; break;
      case 'price-low': orderBy = 'p.price ASC'; break;
      case 'views': orderBy = 'p.views DESC'; break;
      default: orderBy = 'p.created_at DESC';
    }

    const sql = `
      SELECT p.uuid, p.title, p.category, p.price, p.status, p.image, p.views, p.likes,
             p.created_at, s.id AS seller_id, s.name AS seller_name
      FROM products p
      LEFT JOIN sellers s ON p.seller_id = s.id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?;
    `;
    params.push(Number(limit), Number(offset));
    const rows = await q(sql, params);

    // total
    const countSql = `SELECT COUNT(*) AS cnt FROM products p ${whereSql};`;
    const countParams = params.slice(0, Math.max(0, params.length - 2));
    const cntRows = await q(countSql, countParams);
    const total = cntRows[0] ? cntRows[0].cnt : 0;

    // prepend server origin for images if needed (client can also do this)
    const host = req.headers.host ? `${req.protocol}://${req.headers.host}` : '';
    const data = rows.map(r => ({ ...r, image: r.image ? (r.image.startsWith('http') ? r.image : host + r.image) : null }));

    res.json({ data, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list products' });
  }
});

// Protected: create product (seller uploads)
// POST /api/products  (multipart/form-data) fields: title, category, price, status
app.post('/api/products', authenticate, upload.single('image'), async (req, res) => {
  try {
    const seller = req.seller;
    const { title, category = 'uncategorized', price = 0, status = 'active' } = req.body;
    if (!title) return res.status(400).json({ message: 'title required' });
    const uuid = uuidv4();
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const sql = `INSERT INTO products (seller_id, uuid, title, category, price, status, image, views, likes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`;
    const params = [seller.id, uuid, title, category, Number(price) || 0, status, imagePath];
    const result = await q(sql, params);
    const inserted = (await q('SELECT uuid, title, category, price, status, image, created_at FROM products WHERE id = ?', [result.insertId]))[0];
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Protected: list products of authenticated seller
// GET /api/my/products
app.get('/api/my/products', authenticate, async (req, res) => {
  try {
    const seller = req.seller;
    const rows = await q('SELECT uuid, title, category, price, status, image, views, likes, created_at FROM products WHERE seller_id = ? ORDER BY created_at DESC', [seller.id]);
    const host = req.headers.host ? `${req.protocol}://${req.headers.host}` : '';
    const data = rows.map(r => ({ ...r, image: r.image ? (r.image.startsWith('http') ? r.image : host + r.image) : null }));
    res.json({ seller: { id: seller.id, name: seller.name, email: seller.email }, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch seller products' });
  }
});

// Protected: update product (only if seller owns it)
// PUT /api/products/:uuid  (multipart/form-data optional image)
app.put('/api/products/:uuid', authenticate, upload.single('image'), async (req, res) => {
  try {
    const seller = req.seller;
    const uuid = req.params.uuid;
    const rows = await q('SELECT * FROM products WHERE uuid = ? LIMIT 1', [uuid]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    const product = rows[0];
    if (product.seller_id !== seller.id) return res.status(403).json({ message: 'Not allowed' });

    // remove old image if new uploaded
    if (req.file && product.image) {
      const old = path.join(__dirname, product.image);
      fs.unlink(old).catch(()=>{});
    }

    const title = req.body.title !== undefined ? req.body.title : product.title;
    const category = req.body.category !== undefined ? req.body.category : product.category;
    const price = req.body.price !== undefined ? Number(req.body.price) : product.price;
    const status = req.body.status !== undefined ? req.body.status : product.status;
    const image = req.file ? `/uploads/${req.file.filename}` : product.image;

    await q(`UPDATE products SET title=?, category=?, price=?, status=?, image=?, updated_at=NOW() WHERE uuid = ?`, [title, category, price, status, image, uuid]);
    const updated = (await q('SELECT uuid, title, category, price, status, image, views, likes, created_at FROM products WHERE uuid = ?', [uuid]))[0];
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Protected: delete product (only if seller owns it)
app.delete('/api/products/:uuid', authenticate, async (req, res) => {
  try {
    const seller = req.seller;
    const uuid = req.params.uuid;
    const rows = await q('SELECT * FROM products WHERE uuid = ? LIMIT 1', [uuid]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    const product = rows[0];
    if (product.seller_id !== seller.id) return res.status(403).json({ message: 'Not allowed' });

    // delete image file
    if (product.image) {
      const f = path.join(__dirname, product.image);
      fs.unlink(f).catch(()=>{});
    }

    await q('DELETE FROM products WHERE uuid = ?', [uuid]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Public: get single product by uuid (and increment views)
app.get('/api/products/:uuid', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const rows = await q('SELECT p.*, s.name AS seller_name FROM products p LEFT JOIN sellers s ON p.seller_id = s.id WHERE p.uuid = ? LIMIT 1', [uuid]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    // increment view count (non-blocking)
    q('UPDATE products SET views = views + 1 WHERE uuid = ?', [uuid]).catch(()=>{});
    const p = rows[0];
    const host = req.headers.host ? `${req.protocol}://${req.headers.host}` : '';
    if (p.image && !p.image.startsWith('http')) p.image = host + p.image;
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get product' });
  }
});

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
