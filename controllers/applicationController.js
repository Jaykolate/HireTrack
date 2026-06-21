// controllers/applicationController.js
const pool = require('../config/db');
const { getAuth } = require('@clerk/express');

const VALID_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];

// Shared validation for create/update
function validateApplication(body) {
  const errors = [];
  const { company_name, role_title, status, applied_date } = body;

  // Company name
  if (!company_name || !company_name.trim()) {
    errors.push('Company name is required.');
  } else if (company_name.trim().length > 100) {
    errors.push('Company name must be 100 characters or fewer.');
  }

  // Role title
  if (!role_title || !role_title.trim()) {
    errors.push('Role title is required.');
  } else if (role_title.trim().length > 100) {
    errors.push('Role title must be 100 characters or fewer.');
  }

  // Status
  if (!status || !VALID_STATUSES.includes(status)) {
    errors.push('Status must be one of: ' + VALID_STATUSES.join(', ') + '.');
  }

  // Applied date
  if (!applied_date) {
    errors.push('Applied date is required.');
  } else {
    const parsed = new Date(applied_date);
    if (isNaN(parsed.getTime())) {
      errors.push('Applied date must be a valid date.');
    } else {
      // Compare date-only (strip time) to avoid timezone edge cases
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (parsed > today) {
        errors.push('Applied date cannot be in the future.');
      }
    }
  }

  return errors;
}

// GET all applications + stats for dashboard
exports.getDashboard = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    // If not logged in, show empty dashboard
    if (!userId) {
      return res.render('dashboard', {
        applications: [],
        stats: { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 },
        total: 0
      });
    }

    const [applications] = await pool.query(
      'SELECT * FROM applications WHERE user_id = ? ORDER BY applied_date DESC',
      [userId]
    );

    const [stats] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM applications
      WHERE user_id = ?
      GROUP BY status
    `, [userId]);

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
    const { userId } = getAuth(req);
    const [rows] = await pool.query(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
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
    const { userId } = getAuth(req);
    const { company_name, role_title, status, applied_date, notes } = req.body;
    const errors = validateApplication(req.body);

    if (errors.length > 0) {
      return res.status(400).render('add', {
        errors,
        formData: { company_name, role_title, status, applied_date, notes }
      });
    }

    await pool.query(
      `INSERT INTO applications (user_id, company_name, role_title, status, applied_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, company_name.trim(), role_title.trim(), status, applied_date, notes]
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
    const { userId } = getAuth(req);
    const { company_name, role_title, status, applied_date, notes } = req.body;
    const errors = validateApplication(req.body);

    if (errors.length > 0) {
      // We need the original application record so the edit form still has the id for its action URL
      const [rows] = await pool.query(
        'SELECT * FROM applications WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (rows.length === 0) return res.status(404).send('Not found');

      return res.status(400).render('edit', {
        errors,
        application: rows[0],
        formData: { company_name, role_title, status, applied_date, notes }
      });
    }

    await pool.query(
      `UPDATE applications
       SET company_name = ?, role_title = ?, status = ?, applied_date = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [company_name.trim(), role_title.trim(), status, applied_date, notes, req.params.id, userId]
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
    const { userId } = getAuth(req);
    await pool.query(
      'DELETE FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};