// server.js
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_db'
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// API Routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET || 'your-secret-key');
        res.json({ token, user: { username: user.username, name: user.name, email: user.email, role: user.role } });
    });
});

app.get('/api/user/:username', authenticateToken, (req, res) => {
    const username = req.params.username;
    
    db.query('SELECT username, name, email, role, color, picture FROM users WHERE username = ?', [username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]);
    });
});

app.get('/api/users', authenticateToken, (req, res) => {
    db.query('SELECT username, name, email, role, color, picture FROM users', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

app.get('/api/events/:username', authenticateToken, (req, res) => {
    const username = req.params.username;
    
    db.query('SELECT * FROM events WHERE username = ? ORDER BY date, time', [username], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

app.post('/api/events', authenticateToken, (req, res) => {
    const { title, date, time, description } = req.body;
    const username = req.user.username;
    
    db.query(
        'INSERT INTO events (username, title, date, time, description) VALUES (?, ?, ?, ?, ?)',
        [username, title, date, time, description],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ id: result.insertId, message: 'Event created successfully' });
        }
    );
});

app.delete('/api/events/:id', authenticateToken, (req, res) => {
    const eventId = req.params.id;
    const username = req.user.username;
    
    db.query('DELETE FROM events WHERE id = ? AND username = ?', [eventId, username], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    });
});

app.get('/api/messages/received/:username', authenticateToken, (req, res) => {
    const username = req.params.username;
    
    db.query(
        'SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender = u.username WHERE m.receiver = ? ORDER BY m.timestamp DESC',
        [username],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(results);
        }
    );
});

app.get('/api/messages/sent/:username', authenticateToken, (req, res) => {
    const username = req.params.username;
    
    db.query(
        'SELECT m.*, u.name as receiver_name FROM messages m JOIN users u ON m.receiver = u.username WHERE m.sender = ? ORDER BY m.timestamp DESC',
        [username],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(results);
        }
    );
});

app.post('/api/messages', authenticateToken, (req, res) => {
    const { receiver, subject, body } = req.body;
    const sender = req.user.username;
    
    db.query(
        'INSERT INTO messages (sender, receiver, subject, body) VALUES (?, ?, ?, ?)',
        [sender, receiver, subject, body],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ id: result.insertId, message: 'Message sent successfully' });
        }
    );
});

app.put('/api/messages/:id/read', authenticateToken, (req, res) => {
    const messageId = req.params.id;
    const username = req.user.username;
    
    db.query('UPDATE messages SET read_status = 1 WHERE id = ? AND receiver = ?', [messageId, username], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Message marked as read' });
    });
});

app.delete('/api/messages/:id', authenticateToken, (req, res) => {
    const messageId = req.params.id;
    const username = req.user.username;
    
    db.query('DELETE FROM messages WHERE id = ? AND (sender = ? OR receiver = ?)', [messageId, username, username], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Message deleted successfully' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
