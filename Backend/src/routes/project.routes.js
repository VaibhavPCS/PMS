// src/routes/project.routes.js
const express = require('express');
const ctrl = require('../controllers/project.controller');
const note = require('../controllers/note.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');

const router = express.Router();

// Admin
router.post('/', auth, requireRole(['admin']), ctrl.createProject);
router.get('/', auth, requireRole(['admin']), ctrl.listAll);

// Shared (admin + heads)
router.get('/mine', auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.listMine);
router.get('/:id', auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.getById);

// Stage ops by role
router.patch('/:id/stage/data/estimate',   auth, requireRole(['data_head']),   ctrl.estimateStage);
router.patch('/:id/stage/data/complete',   auth, requireRole(['data_head']),   ctrl.completeStage);
router.patch('/:id/stage/design/estimate', auth, requireRole(['design_head']), ctrl.estimateStage);
router.patch('/:id/stage/design/complete', auth, requireRole(['design_head']), ctrl.completeStage);
router.patch('/:id/stage/dev/estimate',    auth, requireRole(['dev_head']),    ctrl.estimateStage);
router.patch('/:id/stage/dev/complete',    auth, requireRole(['dev_head']),    ctrl.completeStage);

// Notes (RBAC inside service does fine-grained checks)
router.get('/:id/stage/:team/notes',                 auth, requireRole(['admin','data_head','design_head','dev_head']), note.list);
router.post('/:id/stage/:team/notes',                auth, requireRole(['admin','data_head','design_head','dev_head']), note.add);
router.patch('/:id/stage/:team/notes/:noteId',       auth, requireRole(['admin','data_head','design_head','dev_head']), note.update);
router.delete('/:id/stage/:team/notes/:noteId',      auth, requireRole(['admin','data_head','design_head','dev_head']), note.remove);

router.get('/:id/stage/:team/notes', 
  auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.listNotes);

router.post('/:id/stage/:team/notes', 
  auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.addNote);

router.patch('/:id/stage/:team/notes/:noteId', 
  auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.updateNote);

router.delete('/:id/stage/:team/notes/:noteId', 
  auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.deleteNote);

module.exports = router;
