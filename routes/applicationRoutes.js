// routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const { getAuth } = require('@clerk/express');
const controller = require('../controllers/applicationController');

// Custom auth guard using getAuth()
function requireAuthCustom(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.redirect('/sign-in');
  }
  next();
}

// Public — dashboard visible to everyone
router.get('/', controller.getDashboard);

// Protected — require login for creating, editing, deleting applications
router.get('/applications/new', requireAuthCustom, controller.renderAddForm);
router.get('/applications/:id/details', requireAuthCustom, controller.getApplicationDetails);
router.get('/applications/:id', requireAuthCustom, controller.getApplication);
router.post('/applications', requireAuthCustom, controller.createApplication);
router.put('/applications/:id', requireAuthCustom, controller.updateApplication);
router.delete('/applications/:id', requireAuthCustom, controller.deleteApplication);

module.exports = router;