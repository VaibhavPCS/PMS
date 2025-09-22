const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const ctrl = require('../controllers/user.controller');

const router = express.Router();

// List active users (optionally filter by role)
router.get('/', auth, requireRole(['admin']), ctrl.listActive);

module.exports = router;

