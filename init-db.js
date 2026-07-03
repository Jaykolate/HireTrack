const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function initDb() {
  try {
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql on database...');
    // Simple table creation execution
    await pool.query(sql);

    console.log('Database initialized successfully! "applications" table created.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }
}

initDb();
