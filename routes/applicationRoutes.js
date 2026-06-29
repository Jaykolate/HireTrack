
const express = require('express');
const router = express.Router();
const { getAuth } = require('@clerk/express');
const controller = require('../controllers/applicationController');
const upload = require('../config/upload');

// Custom auth guard using getAuth() instead of deprecated requireAuth()
function requireAuthCustom(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.redirect('/sign-in');
  }
  next();
}

// Multer error handler middleware
function handleUploadError(err, req, res, next) {
  if (err) {
    const message = err.message || 'File upload failed.';
    return res.status(400).render('add', {
      errors: [message],
      formData: req.body || {}
    });
  }
  next();
}

// Public — dashboard visible to everyone
router.get('/', controller.getDashboard);

// Protected — require login for creating, editing, deleting
router.get('/applications/new', requireAuthCustom, (req, res) => res.render('add'));
router.get('/applications/:id/details', requireAuthCustom, controller.getApplicationDetails);
router.get('/applications/:id', requireAuthCustom, controller.getApplication);
router.post('/applications', requireAuthCustom, upload.single('resume'), handleUploadError, controller.createApplication);
router.put('/applications/:id', requireAuthCustom, upload.single('resume'), handleUploadError, controller.updateApplication);
router.delete('/applications/:id', requireAuthCustom, controller.deleteApplication);

module.exports = router;