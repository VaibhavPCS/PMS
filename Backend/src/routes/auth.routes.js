// src/routes/auth.routes.js
const express = require('express');
const { body } = require('express-validator');
const authCtrl = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post(
  '/signup',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['admin', 'data_head', 'design_head', 'dev_head'])
  ],
  authCtrl.signup
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ],
  authCtrl.login
);

router.get('/me', auth, authCtrl.me);

module.exports = router;
