const express = require('express');
const ctrl = require('../controllers/project.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');

const router = express.Router();

// Params
const idParam = param('id').isMongoId().withMessage('Invalid project id');
const teamParam = param('team').isIn(['data', 'design', 'dev']).withMessage('Invalid team');
const noteIdParam = param('noteId').isMongoId().withMessage('Invalid note id');

// Bodies
const createBody = [
  body('title').isString().trim().notEmpty(),
  body('description').optional().isString()
];

const estimateBody = [
  body('startISO').optional().isISO8601().toDate(),
  body('hours').isFloat({ gt: 0 }).withMessage('hours>0 required')
];

const completeBody = [
  body('startISO').isISO8601().withMessage('startISO required').toDate(),
  body('endISO').isISO8601().withMessage('endISO required').toDate()
];

const adminExpectedBody = [
  body('startISO').optional().isISO8601().toDate(),
  body('days').optional().isInt({ min: 0 }),
  body('hours').optional().isInt({ min: 0 })
];

const noteBody = [ body('text').isString().trim().isLength({ min:1, max:2000 }) ];

// Query filters (optional)
const listAllQuery = [
  query('page').optional().isInt({ min:1 }),
  query('limit').optional().isInt({ min:1, max:100 }),
  query('status').optional().isIn(['queued','in_data','in_design','in_dev','done']),
  query('team').optional().isIn(['data','design','dev']),
  query('search').optional().isString()
];

// Admin: create project
router.post('/', auth, requireRole(['admin']), createBody, validate, ctrl.createProject);

// Lists
router.get('/', auth, requireRole(['admin']), listAllQuery, validate, ctrl.listAll);
router.get('/mine', auth, requireRole(['admin','data_head','design_head','dev_head']), ctrl.listMine);

// Fetch one
router.get('/:id', auth, requireRole(['admin','data_head','design_head','dev_head']), idParam, validate, ctrl.getById);

// Stage estimate/complete (generic)
router.patch('/:id/stage/:team/estimate',
  auth, requireRole(['admin','data_head','design_head','dev_head']),
  idParam, teamParam, estimateBody, validate, ctrl.estimateStage
);

router.patch('/:id/stage/:team/complete',
  auth, requireRole(['admin','data_head','design_head','dev_head']),
  idParam, teamParam, completeBody, validate, ctrl.completeStage
);

// Admin-only: adminExpected
router.patch('/:id/stage/:team/adminExpected',
  auth, requireRole(['admin']),
  idParam, teamParam, adminExpectedBody, validate, ctrl.updateAdminExpected
);

// Notes
router.get('/:id/stage/:team/notes',
  auth, requireRole(['admin','data_head','design_head','dev_head']),
  idParam, teamParam, validate, ctrl.listNotes
);
router.post('/:id/stage/:team/notes',
  auth, requireRole(['admin','data_head','design_head','dev_head']),
  idParam, teamParam, noteBody, validate, ctrl.addNote
);
router.patch('/:id/stage/:team/notes/:noteId',
  auth, requireRole(['admin','data_head','design_head','dev_head']),
  idParam, teamParam, noteIdParam, noteBody, validate, ctrl.updateNote
);
router.delete('/:id/stage/:team/notes/:noteId',
  auth, requireRole(['admin','data_head','design_head','dev_head']),
  idParam, teamParam, noteIdParam, validate, ctrl.deleteNote
);

module.exports = router;
