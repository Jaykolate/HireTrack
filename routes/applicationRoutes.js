
const express = require('express');
const router = express.Router();
const { getAuth } = require('@clerk/express');
const controller = require('../controllers/applicationController');

// Custom auth guard using getAuth() instead of deprecated requireAuth()
function requireAuthCustom(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.redirect('/sign-in');
  }
  next();
}

// Public — dashboard visible to everyone
router.get('/', controller.getDashboard);

// Protected — require login for creating, editing, deleting
router.get('/applications/new', requireAuthCustom, (req, res) => res.render('add'));
router.get('/applications/:id', requireAuthCustom, controller.getApplication);
router.post('/applications', requireAuthCustom, controller.createApplication);
router.put('/applications/:id', requireAuthCustom, controller.updateApplication);
router.delete('/applications/:id', requireAuthCustom, controller.deleteApplication);

module.exports = router;