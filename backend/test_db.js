const { query } = require('./db');
require('dotenv').config();

async function testConnection() {
  try {
    const res = await query('SELECT NOW()');
    console.log('Database connected:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
