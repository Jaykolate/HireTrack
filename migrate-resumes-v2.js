// migrate-resumes-v2.js
const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Starting Migration: Resume Version Management...');

    // 1. Create resumes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(100) NOT NULL,
        version VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_user_title_version (user_id, title, version),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "resumes" created or already exists.');

    // 2. Add resume_id column to applications table if not exists
    const [cols] = await pool.query("SHOW COLUMNS FROM applications LIKE 'resume_id'");
    if (cols.length === 0) {
      await pool.query('ALTER TABLE applications ADD COLUMN resume_id INT DEFAULT NULL');
      console.log('Column "resume_id" added to "applications" table.');
    } else {
      console.log('Column "resume_id" already exists in "applications".');
    }

    // 3. Migrate existing application direct resume uploads into resumes table
    const [appsToMigrate] = await pool.query(
      `SELECT id, user_id, company_name, role_title, resume_file_name, resume_file_url 
       FROM applications 
       WHERE resume_id IS NULL AND resume_file_url IS NOT NULL AND CHAR_LENGTH(resume_file_url) > 0`
    );

    if (appsToMigrate.length > 0) {
      console.log(`Migrating ${appsToMigrate.length} legacy application resume uploads...`);
      for (const app of appsToMigrate) {
        const title = app.company_name ? `${app.company_name} Resume` : 'General Resume';
        const fileName = app.resume_file_name || 'resume.pdf';
        const filePath = app.resume_file_url;
        let version = 'v1';
        let count = 1;

        // Ensure unique title + version
        while (true) {
          const [dup] = await pool.query(
            'SELECT id FROM resumes WHERE user_id = ? AND title = ? AND version = ?',
            [app.user_id, title, version]
          );
          if (dup.length === 0) break;
          count++;
          version = `v${count}`;
        }

        const [result] = await pool.query(
          `INSERT INTO resumes (user_id, title, version, file_name, file_path) VALUES (?, ?, ?, ?, ?)`,
          [app.user_id, title, version, fileName, filePath]
        );

        const newResumeId = result.insertId;
        await pool.query('UPDATE applications SET resume_id = ? WHERE id = ?', [newResumeId, app.id]);
        console.log(`Migrated resume for App ID ${app.id} -> Resume ID ${newResumeId} ("${title}" ${version})`);
      }
    } else {
      console.log('No legacy resumes need migration.');
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
