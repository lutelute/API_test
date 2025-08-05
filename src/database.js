const { Pool } = require('pg');
require('dotenv').config();

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/measurement_api',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// データベース接続テスト
pool.on('connect', () => {
  console.log('Connected to the database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

module.exports = pool;