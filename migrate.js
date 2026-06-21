// One-time migration script: adds user_id column to applications table
const pool = require('./config/db');

async function migrate() {
  try {
    // Check if user_id column already exists
    const [cols] = await pool.query("SHOW COLUMNS FROM applications LIKE 'user_id'");
    if (cols.length > 0) {
      console.log('user_id column already exists, skipping.');
    } else {
      await pool.query("ALTER TABLE applications ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '' AFTER id");
      await pool.query("ALTER TABLE applications ADD INDEX idx_user_id (user_id)");
      console.log('Successfully added user_id column and index.');
    }

    // Show current schema
    const [schema] = await pool.query("DESCRIBE applications");
    console.table(schema);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
