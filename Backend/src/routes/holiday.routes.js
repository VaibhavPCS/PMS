const express = require('express');
const ctrl = require('../controllers/holiday.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');

const router = express.Router();

// Admin-only management
router.post('/', auth, requireRole(['admin']), ctrl.addHoliday);
router.get('/', auth, requireRole(['admin']), ctrl.listHolidays);
router.patch('/:id', auth, requireRole(['admin']), ctrl.updateHoliday);

module.exports = router;
