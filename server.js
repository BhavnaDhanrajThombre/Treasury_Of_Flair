// const path = require("path");
// const express = require("express");
// const mysql = require("mysql2");
// const bcrypt = require("bcrypt");   // for password hashing
// const bodyParser = require("body-parser");
// const cors = require("cors");

// const app = express();
// app.use(cors());               // allow frontend requests
// app.use(bodyParser.json());    // parse JSON bodies

// // ✅ Serve static frontend files from /public
// app.use(express.static(path.join(__dirname, "public")));

// // ✅ When user visits "/", show login.html
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "login.html"));
// });

// // (your MySQL connection + signup/login routes remain unchanged)


// // --- MySQL connection ---
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",        // change to your MySQL username
//   password: "root",    // change to your MySQL password
//   database: "tof_app"
// });

// db.connect((err) => {
//   if (err) {
//     console.error("Database connection failed:", err);
//     return;
//   }
//   console.log("Connected to MySQL database.");
// });

// // --- Root route (fixes "Cannot GET /") ---
// app.get("/", (req, res) => {
//   res.send("✅ Backend is running. Use POST /signup or POST /login");
// });

// // --- Signup route ---
// app.post("/signup", async (req, res) => {
//   const { name, email, password } = req.body;

//   if (!name || !email || !password) {
//     return res.status(400).json({ error: "All fields are required." });
//   }

//   try {
//     const hashedPw = await bcrypt.hash(password, 10);
//     const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
//     db.query(sql, [name, email, hashedPw], (err, result) => {
//       if (err) {
//         if (err.code === "ER_DUP_ENTRY") {
//           return res.status(409).json({ error: "Email already registered." });
//         }
//         return res.status(500).json({ error: "Database error." });
//       }
//       res.json({ message: "Account created successfully!" });
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Server error." });
//   }
// });

// // --- Login route ---
// app.post("/login", (req, res) => {
//   const { identity, password } = req.body;

//   if (!identity || !password) {
//     return res.status(400).json({ error: "Email/Name and password required." });
//   }

//   const sql = "SELECT * FROM users WHERE email = ? OR name = ?";
//   db.query(sql, [identity, identity], async (err, results) => {
//     if (err) return res.status(500).json({ error: "Database error." });
//     if (results.length === 0) {
//       return res.status(404).json({ error: "No account found." });
//     }

//     const user = results[0];
//     const match = await bcrypt.compare(password, user.password);

//     if (!match) {
//       return res.status(401).json({ error: "Incorrect password." });
//     }

//     res.json({
//       message: "Login successful",
//       user: { id: user.id, name: user.name, email: user.email }
//     });
//   });
// });

// // --- start server ---
// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });





const path = require("path");
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");   // password hashing
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");

const app = express();

// --- Middleware ---
app.use(cors({
  origin: "http://localhost:5000", // frontend origin (adjust if different)
  credentials: true
}));
app.use(bodyParser.json());
app.use(session({
  secret: "your_secret_key",   // change to strong random string
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }    // set true only if using HTTPS
}));

// ✅ Serve static frontend files (public folder)
app.use(express.static(path.join(__dirname, "public")));

// --- MySQL connection ---
const db = mysql.createConnection({
  host: "localhost",
  user: "root",        // change if needed
  password: "root",    // change if needed
  database: "tof_app"  // your DB name
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database.");
});

// --- Signup route ---
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

// --- Login route ---
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

    // ✅ Save user in session
    req.session.username = user.name;
    req.session.email = user.email;

    res.json({ message: "Login successful" });
  });
});

// --- Home route (returns logged-in user info) ---
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

// --- Start server ---
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

