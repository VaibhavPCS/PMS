const express = require('express');
const ctrl = require('../controllers/project.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');

const router = express.Router();

// In production, protect these with auth + role guards
router.post('/', auth, requireRole(['admin']), ctrl.createProject);
router.post('/test', ctrl.createTest);
router.patch('/:id/stage/:team/estimate', ctrl.estimateStage);
router.patch('/:id/stage/:team/complete', ctrl.completeStage);
// Admin only — creating test projects
router.post('/test', auth, requireRole(['admin']), ctrl.createTest);

// Data head sets estimate & completes data stage
router.patch('/:id/stage/data/estimate', auth, requireRole(['data_head']), ctrl.estimateStage);
router.patch('/:id/stage/data/complete', auth, requireRole(['data_head']), ctrl.completeStage);

// Design head
router.patch('/:id/stage/design/estimate', auth, requireRole(['design_head']), ctrl.estimateStage);
router.patch('/:id/stage/design/complete', auth, requireRole(['design_head']), ctrl.completeStage);

// Dev head
router.patch('/:id/stage/dev/estimate', auth, requireRole(['dev_head']), ctrl.estimateStage);
router.patch('/:id/stage/dev/complete', auth, requireRole(['dev_head']), ctrl.completeStage);

router.get('/', auth, requireRole(['admin']), ctrl.listAll);

// My projects (admin sees all; heads see assigned/created)
router.get('/mine', auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.listMine);

// Get one project by id (access-controlled inside service)
router.get('/:id', auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.getById);
``
// Existing stage ops (already present)
router.post('/test', auth, requireRole(['admin']), ctrl.createTest);
router.patch('/:id/stage/data/estimate', auth, requireRole(['data_head']), ctrl.estimateStage);
router.patch('/:id/stage/data/complete', auth, requireRole(['data_head']), ctrl.completeStage);
router.patch('/:id/stage/design/estimate', auth, requireRole(['design_head']), ctrl.estimateStage);
router.patch('/:id/stage/design/complete', auth, requireRole(['design_head']), ctrl.completeStage);
router.patch('/:id/stage/dev/estimate', auth, requireRole(['dev_head']), ctrl.estimateStage);
router.patch('/:id/stage/dev/complete', auth, requireRole(['dev_head']), ctrl.completeStage);

module.exports = router;