const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

// ----------------------
//  MYSQL CONNECTION
// ----------------------
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "tof_app"
});

// ----------------------
//  MIDDLEWARES
// ----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
//  SESSION CONFIGURATION
// ----------------------
app.use(session({
    secret: "your_secret_key",      // replace with a strong secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,              // false for HTTP, true for HTTPS
        httpOnly: true,             // JS cannot access cookie
        sameSite: "lax"             // allows cookies with same-origin requests
    }
}));

// ----------------------
//  SERVE STATIC FILES
// ----------------------
app.use(express.static(path.join(__dirname, "public")));

// ----------------------
//  DEFAULT ROUTE
// ----------------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ----------------------
//  LOGIN ROUTE
// ----------------------
app.post("/login", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username required." });

    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        if (rows.length === 0) return res.status(404).json({ message: "User not found." });

        // Set session
        req.session.userId = rows[0].id;

        res.json({ message: "Logged in successfully.", username: rows[0].username });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// ----------------------
//  GET USER DATA
// ----------------------
app.get("/home", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in." });

    try {
        const [rows] = await db.query("SELECT username FROM users WHERE id = ?", [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ message: "User not found." });

        res.json({ username: rows[0].username });
    } catch (err) {
        console.error("Get home error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// ----------------------
//  DELETE USER ACCOUNT
// ----------------------
app.delete('/delete-account', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in." });

    try {
        const [result] = await db.query("DELETE FROM users WHERE id = ?", [req.session.userId]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "User not found." });

        // Destroy session and respond
        req.session.destroy(err => {
            if (err) {
                console.error("Session destroy error:", err);
                return res.status(500).json({ message: "Failed to destroy session." });
            }
            res.clearCookie("connect.sid");
            res.json({ message: "Account deleted successfully." });
        });
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// ----------------------
//  DEBUG SESSION ROUTE
// ----------------------
app.get("/check-session", (req, res) => {
    console.log("Session data:", req.session);
    res.json({ session: req.session });
});

// ----------------------
//  START SERVER
// ----------------------
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
