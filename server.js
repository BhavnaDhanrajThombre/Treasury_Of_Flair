const path = require("path");
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const searchRoutes = require('./artwork_search');

const app = express();
const PORT = 5000;

// --- Middleware ---
app.use(cors({
  origin: "http://localhost:5000",
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(session({
  secret: "your_secret_key_change_this", // TODO: Use environment variable
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, "public")));
app.use('/Images', express.static(path.join(__dirname, 'Images')));

// --- MySQL Connection ---
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "tof_app"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database.");
});

// --- Authentication Routes ---
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const hashedPw = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(sql, [name, email, hashedPw], (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Email already registered." });
        }
        return res.status(500).json({ error: "Database error." });
      }
      res.json({ message: "Account created successfully!" });
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

app.post("/login", (req, res) => {
  const { identity, password } = req.body;

  if (!identity || !password) {
    return res.status(400).json({ error: "Email/Name and password required." });
  }

  const sql = "SELECT * FROM users WHERE email = ? OR name = ?";
  db.query(sql, [identity, identity], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (results.length === 0) {
      return res.status(404).json({ error: "No account found." });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    req.session.username = user.name;
    req.session.email = user.email;

    res.json({ message: "Login successful" });
  });
});

app.get("/home", (req, res) => {
  if (req.session.username && req.session.email) {
    res.json({
      username: req.session.username,
      email: req.session.email
    });
  } else {
    res.json({ message: "Please login first" });
  }
});

// --- API Routes ---
app.use('/api/search', searchRoutes);

// --- Test Route ---
app.get('/', (req, res) => {
  res.send('Server is working!');
});

// --- Start Server (Only Once!) ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
