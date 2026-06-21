// controllers/applicationController.js
const pool = require('../config/db');

// GET all applications + stats for dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [applications] = await pool.query(
      'SELECT * FROM applications ORDER BY applied_date DESC'
    );

    const [stats] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM applications
      GROUP BY status
    `);

    // Convert stats array into a lookup object: { Applied: 5, Interview: 2, ... }
    const statsMap = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 };
    stats.forEach(row => { statsMap[row.status] = row.count; });

    res.render('dashboard', {
      applications,
      stats: statsMap,
      total: applications.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// GET single application (detail/edit view)
exports.getApplication = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM applications WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).send('Not found');
    res.render('edit', { application: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// POST create new application
exports.createApplication = async (req, res) => {
  try {
    const { company_name, role_title, status, applied_date, notes } = req.body;
    await pool.query(
      `INSERT INTO applications (company_name, role_title, status, applied_date, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [company_name, role_title, status, applied_date, notes]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// PUT/PATCH update application
exports.updateApplication = async (req, res) => {
  try {
    const { company_name, role_title, status, applied_date, notes } = req.body;
    await pool.query(
      `UPDATE applications
       SET company_name = ?, role_title = ?, status = ?, applied_date = ?, notes = ?
       WHERE id = ?`,
      [company_name, role_title, status, applied_date, notes, req.params.id]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// DELETE application
exports.deleteApplication = async (req, res) => {
  try {
    await pool.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};