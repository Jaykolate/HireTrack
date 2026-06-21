
const express = require('express');
const router = express.Router();
const controller = require('../controllers/applicationController');

router.get('/', controller.getDashboard);
router.get('/applications/new', (req, res) => res.render('add'));
router.get('/applications/:id', controller.getApplication);
router.post('/applications', controller.createApplication);
router.put('/applications/:id', controller.updateApplication);
router.delete('/applications/:id', controller.deleteApplication);

module.exports = router;