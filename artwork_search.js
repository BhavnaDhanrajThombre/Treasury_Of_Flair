// artworks_backend.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root", // 👈 change if needed
    password: "root", // 👈 your MySQL password if any
    database: "tof_app" // 👈 must match your DB name
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database Connection Error:", err);
        return;
    }
    console.log("✅ Connected to MySQL Database");
});

// ✅ Search Endpoint
app.get("/api/search", (req, res) => {
    const search = req.query.q ? req.query.q.trim() : "";

    if (!search) {
        return res.status(400).json({ error: "Search query is required" });
    }

    const sql = `
        SELECT id, category, title, artist, description, image_url, price, availability, popularity
        FROM artworks
        WHERE
            title LIKE ?
            OR artist LIKE ?
            OR category LIKE ?
            OR description LIKE ?
        ORDER BY popularity DESC;
    `;

    const like = `%${search}%`;
    db.query(sql, [like, like, like, like], (err, results) => {
        if (err) {
            console.error("❌ Search Query Error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results);
    });
});

// ✅ Serve frontend files
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));

// ✅ Default route → search.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "search_page.html"));
});

// ✅ Start Server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
