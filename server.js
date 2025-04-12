const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize database
const db = new sqlite3.Database('./database.sqlite');

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      department TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      admin_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    )
  `);
});

// API Endpoints

// Save new submission
app.post('/api/submissions', (req, res) => {
  const { name, email, phone, department, message } = req.body;
  
  db.run(
    `INSERT INTO submissions (name, email, phone, department, message) 
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, phone, department, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Get all submissions
app.get('/api/submissions', (req, res) => {
  db.all(
    `SELECT s.*, 
     (SELECT COUNT(*) FROM replies WHERE submission_id = s.id) as reply_count
     FROM submissions s ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Get replies for a submission
app.get('/api/submissions/:id/replies', (req, res) => {
  db.all(
    `SELECT * FROM replies WHERE submission_id = ? ORDER BY created_at`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Add a reply
app.post('/api/submissions/:id/replies', (req, res) => {
  const { message, adminName } = req.body;
  
  db.run(
    `INSERT INTO replies (submission_id, message, admin_name)
     VALUES (?, ?, ?)`,
    [req.params.id, message, adminName],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Update submission status
      db.run(
        `UPDATE submissions SET status = 'replied' WHERE id = ?`,
        [req.params.id]
      );
      
      res.json({ id: this.lastID });
    }
  );
});

const PORT = process.env.PORT || 5501;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});