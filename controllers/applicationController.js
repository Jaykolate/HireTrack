// controllers/applicationController.js
const pool = require('../config/db');
const { getAuth } = require('@clerk/express');
const path = require('path');
const fs = require('fs');

const VALID_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];

// Shared validation for create/update
function validateApplication(body) {
  const errors = [];
  const { company_name, role_title, status, applied_date } = body;

  if (!company_name || !company_name.trim()) {
    errors.push('Company name is required.');
  } else if (company_name.trim().length > 100) {
    errors.push('Company name must be 100 characters or fewer.');
  }

  if (!role_title || !role_title.trim()) {
    errors.push('Role title is required.');
  } else if (role_title.trim().length > 100) {
    errors.push('Role title must be 100 characters or fewer.');
  }

  if (!status || !VALID_STATUSES.includes(status)) {
    errors.push('Status must be one of: ' + VALID_STATUSES.join(', ') + '.');
  }

  if (!applied_date) {
    errors.push('Applied date is required.');
  } else {
    const parsed = new Date(applied_date);
    if (isNaN(parsed.getTime())) {
      errors.push('Applied date must be a valid date.');
    } else {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (parsed > today) {
        errors.push('Applied date cannot be in the future.');
      }
    }
  }

  return errors;
}

// Helper: delete a local resume file
function deleteLocalFile(fileUrl) {
  if (!fileUrl) return;
  try {
    const filePath = path.join(__dirname, '..', 'public', fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('File delete error:', err.message);
  }
}

// GET all applications + stats for dashboard
exports.getDashboard = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.render('dashboard', {
        applications: [],
        stats: { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 },
        total: 0,
        timeline: []
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

    const [timeline] = await pool.query(`
      SELECT DATE_FORMAT(applied_date, '%Y-%m') as month, COUNT(*) as count
      FROM applications
      WHERE user_id = ?
      GROUP BY month
      ORDER BY month ASC
    `, [userId]);

    const statsMap = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 };
    stats.forEach(row => { statsMap[row.status] = row.count; });

    res.render('dashboard', {
      applications,
      stats: statsMap,
      total: applications.length,
      timeline
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// GET single application — detail view (read-only)
exports.getApplicationDetails = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const [rows] = await pool.query(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (rows.length === 0) return res.status(404).send('Not found');
    res.render('details', { application: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// GET single application (edit form)
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

    let resumeFileName = null;
    let resumeFileUrl = null;
    let resumeUploadedAt = null;

    if (req.file) {
      resumeFileName = req.file.originalname;
      resumeFileUrl = '/uploads/resumes/' + req.file.filename;
      resumeUploadedAt = new Date();
    }

    await pool.query(
      `INSERT INTO applications
       (user_id, company_name, role_title, status, applied_date, notes, resume_file_name, resume_file_url, resume_uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, company_name.trim(), role_title.trim(), status, applied_date, notes,
       resumeFileName, resumeFileUrl, resumeUploadedAt]
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
    const { company_name, role_title, status, applied_date, notes, remove_resume } = req.body;
    const errors = validateApplication(req.body);

    if (errors.length > 0) {
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

    const [current] = await pool.query(
      'SELECT * FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (current.length === 0) return res.status(404).send('Not found');

    let resumeFileName = current[0].resume_file_name;
    let resumeFileUrl = current[0].resume_file_url;
    let resumeUploadedAt = current[0].resume_uploaded_at;

    // Handle resume removal
    if (remove_resume === 'on') {
      deleteLocalFile(current[0].resume_file_url);
      resumeFileName = null;
      resumeFileUrl = null;
      resumeUploadedAt = null;
    }

    // Handle new resume upload (replaces existing if any)
    if (req.file) {
      if (current[0].resume_file_url) {
        deleteLocalFile(current[0].resume_file_url);
      }
      resumeFileName = req.file.originalname;
      resumeFileUrl = '/uploads/resumes/' + req.file.filename;
      resumeUploadedAt = new Date();
    }

    await pool.query(
      `UPDATE applications
       SET company_name = ?, role_title = ?, status = ?, applied_date = ?, notes = ?,
           resume_file_name = ?, resume_file_url = ?, resume_uploaded_at = ?
       WHERE id = ? AND user_id = ?`,
      [company_name.trim(), role_title.trim(), status, applied_date, notes,
       resumeFileName, resumeFileUrl, resumeUploadedAt,
       req.params.id, userId]
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

    const [rows] = await pool.query(
      'SELECT resume_file_url FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (rows.length > 0 && rows[0].resume_file_url) {
      deleteLocalFile(rows[0].resume_file_url);
    }

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