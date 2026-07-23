// models/resumeModel.js
const pool = require('../config/db');

/**
 * Fetch all resumes belonging to a user
 */
async function getUserResumes(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM resumes WHERE user_id = ? ORDER BY title ASC, created_at DESC',
    [userId]
  );
  return rows;
}

/**
 * Fetch a single resume by ID and user_id
 */
async function getResumeById(id, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM resumes WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return rows[0] || null;
}

/**
 * Check if a resume with the same title & version exists for user
 */
async function findDuplicate(userId, title, version, excludeId = null) {
  let query = 'SELECT id FROM resumes WHERE user_id = ? AND LOWER(title) = LOWER(?) AND LOWER(version) = LOWER(?)';
  const params = [userId, title.trim(), version.trim()];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const [rows] = await pool.query(query, params);
  return rows.length > 0;
}

/**
 * Create a new resume record
 */
async function createResume({ userId, title, version, fileName, filePath }) {
  const [result] = await pool.query(
    `INSERT INTO resumes (user_id, title, version, file_name, file_path)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, title.trim(), version.trim(), fileName, filePath]
  );
  return result.insertId;
}

/**
 * Update resume title and version
 */
async function updateResume({ id, userId, title, version }) {
  const [result] = await pool.query(
    `UPDATE resumes SET title = ?, version = ? WHERE id = ? AND user_id = ?`,
    [title.trim(), version.trim(), id, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Delete a resume record
 */
async function deleteResume(id, userId) {
  const [result] = await pool.query(
    'DELETE FROM resumes WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Get count of applications currently linked to a resume
 */
async function getLinkedApplicationsCount(resumeId, userId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM applications WHERE resume_id = ? AND user_id = ?',
    [resumeId, userId]
  );
  return rows[0].count;
}

/**
 * Get list of applications using a specific resume
 */
async function getApplicationsUsingResume(resumeId, userId) {
  const [rows] = await pool.query(
    `SELECT id, company_name, role_title, status, applied_date
     FROM applications
     WHERE resume_id = ? AND user_id = ?
     ORDER BY applied_date DESC`,
    [resumeId, userId]
  );
  return rows;
}

/**
 * Calculate per-resume analytics & performance metrics for a user
 */
async function getResumesWithAnalytics(userId) {
  const [rows] = await pool.query(
    `SELECT 
        r.id,
        r.user_id,
        r.title,
        r.version,
        r.file_name,
        r.file_path,
        r.created_at,
        COUNT(a.id) as total_applications,
        SUM(CASE WHEN a.status = 'Applied' THEN 1 ELSE 0 END) as applied_count,
        SUM(CASE WHEN a.status = 'Interview' THEN 1 ELSE 0 END) as interview_count,
        SUM(CASE WHEN a.status = 'Offer' THEN 1 ELSE 0 END) as offer_count,
        SUM(CASE WHEN a.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count
     FROM resumes r
     LEFT JOIN applications a ON r.id = a.resume_id AND a.user_id = r.user_id
     WHERE r.user_id = ?
     GROUP BY r.id
     ORDER BY r.title ASC, r.created_at DESC`,
    [userId]
  );

  return rows.map(r => {
    const total = Number(r.total_applications) || 0;
    const interviews = Number(r.interview_count) || 0;
    const offers = Number(r.offer_count) || 0;
    const successRate = total > 0 ? (((interviews + offers) / total) * 100).toFixed(1) : '0.0';

    return {
      ...r,
      total_applications: total,
      applied_count: Number(r.applied_count) || 0,
      interview_count: interviews,
      offer_count: offers,
      rejected_count: Number(r.rejected_count) || 0,
      success_rate: successRate
    };
  });
}

module.exports = {
  getUserResumes,
  getResumeById,
  findDuplicate,
  createResume,
  updateResume,
  deleteResume,
  getLinkedApplicationsCount,
  getApplicationsUsingResume,
  getResumesWithAnalytics
};
