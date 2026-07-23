// controllers/applicationController.js
const pool = require('../config/db');
const { getAuth } = require('@clerk/express');
const path = require('path');
const fs = require('fs');
const resumeModel = require('../models/resumeModel');

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
      `SELECT a.*, r.title as resume_title, r.version as resume_version, r.file_path as resume_path, r.id as resume_id_ref
       FROM applications a
       LEFT JOIN resumes r ON a.resume_id = r.id
       WHERE a.user_id = ?
       ORDER BY a.applied_date DESC`,
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
      `SELECT a.*, r.title as resume_title, r.version as resume_version, r.file_path as resume_path
       FROM applications a
       LEFT JOIN resumes r ON a.resume_id = r.id
       WHERE a.id = ? AND a.user_id = ?`,
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
      `SELECT a.*, r.title as resume_title, r.version as resume_version
       FROM applications a
       LEFT JOIN resumes r ON a.resume_id = r.id
       WHERE a.id = ? AND a.user_id = ?`,
      [req.params.id, userId]
    );
    if (rows.length === 0) return res.status(404).send('Not found');

    const resumes = await resumeModel.getUserResumes(userId);
    res.render('edit', { application: rows[0], resumes });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// GET new application form
exports.renderAddForm = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const resumes = await resumeModel.getUserResumes(userId);
    res.render('add', { resumes });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// POST create new application
exports.createApplication = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { company_name, role_title, status, applied_date, notes, resume_id } = req.body;
    const errors = validateApplication(req.body);

    if (errors.length > 0) {
      const resumes = await resumeModel.getUserResumes(userId);
      return res.status(400).render('add', {
        errors,
        resumes,
        formData: { company_name, role_title, status, applied_date, notes, resume_id }
      });
    }

    const selectedResumeId = resume_id && !isNaN(parseInt(resume_id)) ? parseInt(resume_id) : null;

    await pool.query(
      `INSERT INTO applications
       (user_id, company_name, role_title, status, applied_date, notes, resume_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, company_name.trim(), role_title.trim(), status, applied_date, notes, selectedResumeId]
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
    const { company_name, role_title, status, applied_date, notes, resume_id, remove_resume } = req.body;
    const errors = validateApplication(req.body);

    if (errors.length > 0) {
      const [rows] = await pool.query(
        'SELECT * FROM applications WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (rows.length === 0) return res.status(404).send('Not found');

      const resumes = await resumeModel.getUserResumes(userId);
      return res.status(400).render('edit', {
        errors,
        resumes,
        application: rows[0],
        formData: { company_name, role_title, status, applied_date, notes, resume_id }
      });
    }

    let selectedResumeId = resume_id && !isNaN(parseInt(resume_id)) ? parseInt(resume_id) : null;
    if (remove_resume === 'on') {
      selectedResumeId = null;
    }

    await pool.query(
      `UPDATE applications
       SET company_name = ?, role_title = ?, status = ?, applied_date = ?, notes = ?, resume_id = ?
       WHERE id = ? AND user_id = ?`,
      [company_name.trim(), role_title.trim(), status, applied_date, notes, selectedResumeId, req.params.id, userId]
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