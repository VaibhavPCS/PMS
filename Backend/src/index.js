require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health
app.get('/healthz', async (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] || 'unknown';
  let db = state;
  if (mongoose.connection.readyState === 1) {
    try { await mongoose.connection.db.admin().command({ ping: 1 }); db = 'ok'; }
    catch { db = 'error'; }
  }
  res.json({ ok: true, db, pid: process.pid, uptimeSec: Math.round(process.uptime()) });
});

// 🔽 Mount routes BEFORE listen; error handler LAST
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/holidays', require('./routes/holiday.routes'));
app.use('/api/projects', require('./routes/project.routes'));
// If you still want a test router, mount it under a separate prefix to avoid conflicts:
// app.use('/api/projects-test', require('./routes/project.test.routes'));

app.use(require('./middleware/errorHandler'));

connectDB().then(() => {
  app.listen(port, () => console.log(`🚀 API listening at http://localhost:${port}`));
});
