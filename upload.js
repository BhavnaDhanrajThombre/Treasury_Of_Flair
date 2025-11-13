// // backend.js
// // Complete Node.js backend for Products, Posts & Reels (MySQL + File Upload)
// // Everything (including .env values) is inside this single file.

// import express from "express";
// import cors from "cors";
// import path from "path";
// import multer from "multer";
// import fs from "fs";
// import mysql from "mysql2/promise";

// // ====== CONFIGURATION (edit these) ======
// const config = {
//   DB_HOST: "localhost",
//   DB_USER: "root",
//   DB_PASSWORD: "root",
//   DB_NAME: "tof_app",
//   PORT: 5000,
//   UPLOAD_DIR: "uploads",
// };

// // ====== MYSQL CONNECTION POOL ======
// const pool = mysql.createPool({
//   host: config.DB_HOST,
//   user: config.DB_USER,
//   password: config.DB_PASSWORD,
//   database: config.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// // ====== EXPRESS SETUP ======
// const app = express();
// const __dirname = path.resolve();

// if (!fs.existsSync(config.UPLOAD_DIR))
//   fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });

// app.use(cors({ origin: true, credentials: true }));
// app.use(express.json());
// app.use("/uploads", express.static(path.join(__dirname, config.UPLOAD_DIR)));

// // ====== MULTER (for image/video uploads) ======
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, config.UPLOAD_DIR),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, unique + ext);
//   },
// });
// const upload = multer({ storage });

// // ====== ENDPOINTS ======

// // 🏠 GET user info (for your frontend's /home fetch)
// app.get("/home", async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       "SELECT id, username, bio, location, website FROM users WHERE id = ?",
//       [1]
//     );
//     if (rows.length === 0) return res.json({});
//     res.json(rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 🛒 PRODUCTS
// app.post("/products", upload.single("image"), async (req, res) => {
//   try {
//     const { name, description, price, category, stock, delivery_time, user_id } =
//       req.body;
//     const image_path = req.file ? `/uploads/${req.file.filename}` : null;
//     const uid = user_id || 1;

//     const [result] = await pool.query(
//       `INSERT INTO products (user_id, name, description, price, category, stock, delivery_time, image_path)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [uid, name, description, price || 0, category, stock || 0, delivery_time, image_path]
//     );

//     const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
//       result.insertId,
//     ]);
//     res.json({ product: rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Insert error" });
//   }
// });

// app.get("/products", async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT p.*, u.username FROM products p 
//        JOIN users u ON p.user_id = u.id 
//        ORDER BY p.created_at DESC`
//     );
//     res.json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 🖼️ POSTS
// app.post("/posts", upload.single("image"), async (req, res) => {
//   try {
//     const { title, caption, tags, user_id } = req.body;
//     const image_path = req.file ? `/uploads/${req.file.filename}` : null;
//     const uid = user_id || 1;

//     const [result] = await pool.query(
//       `INSERT INTO posts (user_id, title, caption, tags, image_path)
//        VALUES (?, ?, ?, ?, ?)`,
//       [uid, title, caption, tags, image_path]
//     );

//     const [rows] = await pool.query("SELECT * FROM posts WHERE id = ?", [
//       result.insertId,
//     ]);
//     res.json({ post: rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Insert error" });
//   }
// });

// app.get("/posts", async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT p.*, u.username FROM posts p 
//        JOIN users u ON p.user_id = u.id 
//        ORDER BY p.created_at DESC`
//     );
//     res.json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // 🎬 REELS
// app.post("/reels", upload.single("video"), async (req, res) => {
//   try {
//     const { caption, hashtags, audio_source, user_id } = req.body;
//     const video_path = req.file ? `/uploads/${req.file.filename}` : null;
//     const uid = user_id || 1;

//     const [result] = await pool.query(
//       `INSERT INTO reels (user_id, caption, hashtags, audio_source, video_path)
//        VALUES (?, ?, ?, ?, ?)`,
//       [uid, caption, hashtags, audio_source, video_path]
//     );

//     const [rows] = await pool.query("SELECT * FROM reels WHERE id = ?", [
//       result.insertId,
//     ]);
//     res.json({ reel: rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Insert error" });
//   }
// });

// app.get("/reels", async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT r.*, u.username FROM reels r 
//        JOIN users u ON r.user_id = u.id 
//        ORDER BY r.created_at DESC`
//     );
//     res.json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // ====== START SERVER ======
// app.listen(config.PORT, () => {
//   console.log(`✅ Backend running on port ${config.PORT}`);
// });


const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true })); // adjust your front-end port
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL Connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root', // change to your MySQL password
    database: 'tof_app'
});

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// ------------------ Products API ------------------

// Get all products
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products ORDER BY created_at DESC', (err, results) => {
        if(err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Add new product
app.post('/api/products', upload.single('image'), (req, res) => {
    const { name, price, category } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.query(
        'INSERT INTO products (name, price, category, imageUrl) VALUES (?, ?, ?, ?)',
        [name, price, category, imageUrl],
        (err, result) => {
            if(err) return res.status(500).json({ error: err });
            db.query('SELECT * FROM products WHERE id = ?', [result.insertId], (err2, rows) => {
                if(err2) return res.status(500).json({ error: err2 });
                res.json(rows[0]);
            });
        }
    );
});

// ------------------ Reels API ------------------

// Get all reels
app.get('/api/reels', (req, res) => {
    db.query('SELECT * FROM reels ORDER BY created_at DESC', (err, results) => {
        if(err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Add new reel
app.post('/api/reels', upload.single('video'), (req, res) => {
    const { title } = req.body;
    const videoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.query(
        'INSERT INTO reels (title, videoUrl) VALUES (?, ?)',
        [title, videoUrl],
        (err, result) => {
            if(err) return res.status(500).json({ error: err });
            db.query('SELECT * FROM reels WHERE id = ?', [result.insertId], (err2, rows) => {
                if(err2) return res.status(500).json({ error: err2 });
                res.json(rows[0]);
            });
        }
    );
});

// ------------------ Posts API ------------------

// Get all posts
app.get('/api/posts', (req, res) => {
    db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
        if(err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Add new post
app.post('/api/posts', upload.single('image'), (req, res) => {
    const { title } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.query(
        'INSERT INTO posts (title, imageUrl) VALUES (?, ?)',
        [title, imageUrl],
        (err, result) => {
            if(err) return res.status(500).json({ error: err });
            db.query('SELECT * FROM posts WHERE id = ?', [result.insertId], (err2, rows) => {
                if(err2) return res.status(500).json({ error: err2 });
                res.json(rows[0]);
            });
        }
    );
});

// ------------------ Start Server ------------------
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
