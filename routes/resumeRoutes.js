// routes/resumeRoutes.js
const express = require('express');
const router = express.Router();
const { getAuth } = require('@clerk/express');
const resumeController = require('../controllers/resumeController');
const upload = require('../config/upload');

// Auth middleware guard
function requireAuthCustom(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/sign-in');
  }
  next();
}

// Multer error handler for API
function handleAPIUploadError(err, req, res, next) {
  if (err) {
    const message = err.message || 'File upload failed.';
    return res.status(400).json({ error: message });
  }
  next();
}

// HTML Views
router.get('/resumes', requireAuthCustom, resumeController.renderManageResumesPage);
router.get('/resumes/:id/details', requireAuthCustom, resumeController.renderResumeDetailsPage);

// REST API Endpoints
router.get('/api/resumes', requireAuthCustom, resumeController.getResumesAPI);
router.get('/api/resumes/:id', requireAuthCustom, resumeController.getResumeAPI);
router.post(
  '/api/resumes',
  requireAuthCustom,
  upload.single('pdf'),
  handleAPIUploadError,
  resumeController.createResumeAPI
);
router.put('/api/resumes/:id', requireAuthCustom, resumeController.updateResumeAPI);
router.delete('/api/resumes/:id', requireAuthCustom, resumeController.deleteResumeAPI);

module.exports = router;
