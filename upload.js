// backend.js
// Complete Node.js backend for Products, Posts & Reels (MySQL + File Upload)
// Everything (including .env values) is inside this single file.

import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import fs from "fs";
import mysql from "mysql2/promise";

// ====== CONFIGURATION (edit these) ======
const config = {
  DB_HOST: "localhost",
  DB_USER: "root",
  DB_PASSWORD: "root",
  DB_NAME: "tof_app",
  PORT: 5000,
  UPLOAD_DIR: "uploads",
};

// ====== MYSQL CONNECTION POOL ======
const pool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ====== EXPRESS SETUP ======
const app = express();
const __dirname = path.resolve();

if (!fs.existsSync(config.UPLOAD_DIR))
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, config.UPLOAD_DIR)));

// ====== MULTER (for image/video uploads) ======
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

// ====== ENDPOINTS ======

// 🏠 GET user info (for your frontend's /home fetch)
app.get("/home", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, bio, location, website FROM users WHERE id = ?",
      [1]
    );
    if (rows.length === 0) return res.json({});
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 🛒 PRODUCTS
app.post("/products", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category, stock, delivery_time, user_id } =
      req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;
    const uid = user_id || 1;

    const [result] = await pool.query(
      `INSERT INTO products (user_id, name, description, price, category, stock, delivery_time, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, name, description, price || 0, category, stock || 0, delivery_time, image_path]
    );

    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
      result.insertId,
    ]);
    res.json({ product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.get("/products", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.username FROM products p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 🖼️ POSTS
app.post("/posts", upload.single("image"), async (req, res) => {
  try {
    const { title, caption, tags, user_id } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;
    const uid = user_id || 1;

    const [result] = await pool.query(
      `INSERT INTO posts (user_id, title, caption, tags, image_path)
       VALUES (?, ?, ?, ?, ?)`,
      [uid, title, caption, tags, image_path]
    );

    const [rows] = await pool.query("SELECT * FROM posts WHERE id = ?", [
      result.insertId,
    ]);
    res.json({ post: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.username FROM posts p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 🎬 REELS
app.post("/reels", upload.single("video"), async (req, res) => {
  try {
    const { caption, hashtags, audio_source, user_id } = req.body;
    const video_path = req.file ? `/uploads/${req.file.filename}` : null;
    const uid = user_id || 1;

    const [result] = await pool.query(
      `INSERT INTO reels (user_id, caption, hashtags, audio_source, video_path)
       VALUES (?, ?, ?, ?, ?)`,
      [uid, caption, hashtags, audio_source, video_path]
    );

    const [rows] = await pool.query("SELECT * FROM reels WHERE id = ?", [
      result.insertId,
    ]);
    res.json({ reel: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.get("/reels", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.username FROM reels r 
       JOIN users u ON r.user_id = u.id 
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ====== START SERVER ======
app.listen(config.PORT, () => {
  console.log(`✅ Backend running on port ${config.PORT}`);
});
