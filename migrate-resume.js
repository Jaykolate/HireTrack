// One-time migration: adds resume columns to applications table
const pool = require('./config/db');

async function migrate() {
  try {
    const columnsToAdd = [
      { name: 'resume_file_name', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'resume_file_url',  definition: 'VARCHAR(500) DEFAULT NULL' },
      { name: 'resume_uploaded_at', definition: 'TIMESTAMP NULL DEFAULT NULL' },
    ];

    for (const col of columnsToAdd) {
      const [existing] = await pool.query(
        `SHOW COLUMNS FROM applications LIKE '${col.name}'`
      );
      if (existing.length > 0) {
        console.log(`Column '${col.name}' already exists, skipping.`);
      } else {
        await pool.query(
          `ALTER TABLE applications ADD COLUMN ${col.name} ${col.definition}`
        );
        console.log(`Added column '${col.name}'.`);
      }
    }

    // Show updated schema
    const [schema] = await pool.query('DESCRIBE applications');
    console.table(schema);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
