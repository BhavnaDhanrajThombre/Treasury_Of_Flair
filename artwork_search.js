
// artwork_search.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// MySQL connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tof_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Search endpoint
router.get('/', async (req, res) => {
    try {
        const q = req.query.q;

        if (!q) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const sql = `
            SELECT 
                id, category, title, artist, description, image_path,
                price, availability, popularity
            FROM artworks
            WHERE 
                LOWER(title) LIKE LOWER(?) OR
                LOWER(description) LIKE LOWER(?) OR
                LOWER(artist) LIKE LOWER(?) OR
                LOWER(category) LIKE LOWER(?)
            ORDER BY popularity DESC
            LIMIT 50
        `;

        const params = [
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`
        ];

        const [rows] = await db.query(sql, params);
        res.json(rows);

    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
