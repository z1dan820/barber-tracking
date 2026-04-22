const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3030;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Setup Database SQLite
const db = new sqlite3.Database('./barber.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Terhubung ke database SQLite.');
});

// Setup Tabel Database
db.serialize(() => {
    // Tabel riwayat transaksi (menyimpan snapshot data)
    db.run(`CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        summary TEXT,
        income INTEGER,
        omset INTEGER
    )`);

    // Tabel untuk menyimpan pengaturan paket dinamis
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
});

// --- API RECORDS (TRANSAKSI) ---
app.get('/api/records', (req, res) => {
    db.all("SELECT * FROM records ORDER BY date DESC", [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/records', (req, res) => {
    const { date, summary, income, omset } = req.body;
    db.run(`INSERT INTO records (date, summary, income, omset) VALUES (?, ?, ?, ?)`, 
        [date, summary, income, omset], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.delete('/api/clear', (req, res) => {
    db.run("DELETE FROM records", [], (err) => {
        if (err) return res.status(400).json({ error: err.message });
        db.run("DELETE FROM sqlite_sequence WHERE name='records'"); 
        res.json({ message: "Database transaksi dibersihkan" });
    });
});

// --- API SETTINGS (PENGATURAN PAKET) ---
app.get('/api/settings', (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'services'", [], (err, row) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ data: row ? JSON.parse(row.value) : null });
    });
});

app.post('/api/settings', (req, res) => {
    const { services } = req.body;
    // Gunakan REPLACE INTO agar jika key sudah ada, dia akan menimpa (update)
    db.run(`REPLACE INTO settings (key, value) VALUES ('services', ?)`, 
        [JSON.stringify(services)], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Pengaturan berhasil disimpan" });
    });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
        
