// artwork_search.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// ✅ MySQL connection pool
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',       // replace with your MySQL username
    password: 'root',   // replace with your MySQL password
    database: 'tof_app',// replace with your DB name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ✅ Search endpoint
router.get('/', async (req, res) => {
    try {
        const q = req.query.q;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const [rows] = await db.query(
  `SELECT id, category, title, artist, description, image_url, price
   FROM artworks
   WHERE MATCH(title, description, artist) AGAINST(? IN NATURAL LANGUAGE MODE)
   OR LOWER(title) LIKE LOWER(?) 
   OR LOWER(description) LIKE LOWER(?) 
   OR LOWER(artist) LIKE LOWER(?)
   OR LOWER(category) LIKE LOWER(?)
   ORDER BY popularity DESC, created_at DESC
   LIMIT 50`,
  [q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
);


        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
