// config/db.js
const mongoose = require('mongoose');

async function connectDB() {
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL is missing in .env');

  try {
    await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // fail fast so you notice
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });
  mongoose.connection.on('error', (e) => {
    console.error('Mongo error:', e.message);
  });
}

module.exports = { connectDB };
