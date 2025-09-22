require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const { connectDB } = require('./config/db');

const app = express();
const port = process.env.PORT || 3000;

// Security + JSON first
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/healthz', async (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] || 'unknown';
  let db = state;
  if (mongoose.connection.readyState === 1) {
    try { await mongoose.connection.db.admin().command({ ping: 1 }); db = 'ok'; }
    catch { db = 'error'; }
  }
  res.json({ ok: true, db, pid: process.pid, uptimeSec: Math.round(process.uptime()) });
});

app.get('/', (_req, res) => res.send('Hello World!'));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/holidays', require('./routes/holiday.routes'));
app.use('/api/projects', require('./routes/project.routes'))
app.use('/api/users', require('./routes/user.routes'));

// Error handler LAST
app.use(require('./middleware/errorHandler'));

connectDB().then(() => {
  app.listen(port, () => console.log(`🚀 API listening at http://localhost:${port}`));
});

