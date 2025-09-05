const express = require("express");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log(`Created directory: ${uploadsDir}`);
}

// Enable CORS & JSON parsing
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(bodyParser.json());

// -------------------- SESSION HANDLING --------------------
const sessions = {};
const ADMIN_PASSWORD = "9390410733";


// Admin login
app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const sessionId = Date.now().toString() + Math.random().toString(36).substring(2);
    sessions[sessionId] = true;
    console.log(sessions)
    return res.json({ success: true, sessionId });
  }
  return res.status(401).json({ success: false, message: "Invalid password" });
});

// Admin logout
app.post("/admin/logout", (req, res) => {
  const sessionId = req.headers["x-session-id"];
  if (sessions[sessionId]) {
    delete sessions[sessionId];
  }
  res.json({ success: true });
});

// Middleware to check session
function checkSession(req, res, next) {
  const sessionId = req.headers["x-session-id"];
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ success: false, message: "Session expired" });
  }
  next();
}

// -------------------- DATA HANDLING --------------------
// Function to read and parse Excel to JSON for the frontend
function getExcelData(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Map keys to what frontend expects (e.g., "Roll No" to "rollNo")
    return data.map(row => ({
      name: row['Name'] || 'N/A',
      rollNo: row['Roll No'] || 'N/A',
      year: row['Year'] || 'N/A',
      section: row['Section'] || 'N/A'
    }));
  } catch (error) {
    console.error(`Error processing Excel file ${filePath}:`, error);
    return [];
  }
}

// -------------------- FILE UPLOAD HANDLING --------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // save files in "uploads" folder
  },
  filename: function (req, file, cb) {
    let targetFilename;
    if (file.fieldname === 'registeredFile') {
      targetFilename = 'registered.xlsx';
    } else if (file.fieldname === 'round1File') {
      targetFilename = 'round1.xlsx';
    } else if (file.fieldname === 'winnersFile') {
      targetFilename = 'winners.xlsx';
    } else {
      targetFilename = Date.now() + path.extname(file.originalname); // Fallback
    }
    cb(null, targetFilename);
  },
});

const upload = multer({ storage });

// Function to read and count records from Excel
function processExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  return data.length;
}

// -------------------- ROUTES --------------------

// Upload registered candidates
app.post(
  "/upload/registered",
  checkSession,
  upload.single("registeredFile"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file was uploaded." });
      }
      const count = processExcel(req.file.path);
      res.json({ success: true, count });
    } catch (err) {
      console.error("Upload registered error:", err);
      res.status(500).json({ success: false, message: "An error occurred while processing the file." });
    }
  }
);

// Upload round 1 qualified
app.post(
  "/upload/round1",
  checkSession,
  upload.single("round1File"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file was uploaded." });
      }
      const count = processExcel(req.file.path);
      res.json({ success: true, count });
    } catch (err) {
      console.error("Upload round1 error:", err);
      res.status(500).json({ success: false, message: "An error occurred while processing the file." });
    }
  }
);

// Upload winners
app.post(
  "/upload/winners",
  checkSession,
  upload.single("winnersFile"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file was uploaded." });
      }
      const count = processExcel(req.file.path);
      res.json({ success: true, count });
    } catch (err) {
      console.error("Upload winners error:", err);
      res.status(500).json({ success: false, message: "An error occurred while processing the file." });
    }
  }
);

// -------------------- API ROUTES FOR DATA --------------------
app.get('/api/registered', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'registered.xlsx');
    const data = getExcelData(filePath);
    res.json(data);
});

app.get('/api/round1', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'round1.xlsx');
    const data = getExcelData(filePath);
    res.json(data);
});

app.get('/api/winners', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'winners.xlsx');
    const data = getExcelData(filePath);
    res.json(data);
});

// -------------------- PAGE SERVING ROUTES --------------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/registered", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "registered.html"));
});

app.get("/rounds", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "rounds.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/admin/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
