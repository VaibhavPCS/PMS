// src/routes/project.test.routes.js
const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const router = express.Router();

/**
 * POST /api/projects/test
 * Creates: one admin + three heads (if not exist),
 * a project with DATA/DESIGN/DEV stages,
 * returns the doc.
 */
router.post('/test', async (req, res) => {
  // upsert users
  const roles = ['admin', 'data_head', 'design_head', 'dev_head'];
  const users = {};
  for (const role of roles) {
    users[role] = await User.findOneAndUpdate(
      { email: `${role}@example.com` },
      { name: role.replace('_', ' ').toUpperCase(), passwordHash: 'X', role },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  const project = await Project.create({
    title: 'PMS Smoke Test',
    description: 'Created by /api/projects/test',
    createdBy: users.admin._id,
    status: 'in_data',
    currentTeam: 'data',
    stages: [
      { team: 'data', head: users.data_head._id },
      { team: 'design', head: users.design_head._id },
      { team: 'dev', head: users.dev_head._id }
    ]
  });

  res.status(201).json(project);
});

/**
 * PATCH /api/projects/:id/stage/:team/estimate
 * Body: { startISO, hours }
 */
router.patch('/:id/stage/:team/estimate', async (req, res) => {
  const { id, team } = req.params;
  const { startISO, hours } = req.body;

  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const stage = project.stages.find(s => s.team === team);
  if (!stage) return res.status(400).json({ error: 'invalid team for this project' });

  stage.expected.start = startISO ? new Date(startISO) : new Date();
  stage.expected.hours = Number(hours);

  stage.status = 'in_progress';
  project.status = `in_${team}`;
  project.currentTeam = team;

  await project.save();
  res.json({ ok: true, project });
});

/**
 * PATCH /api/projects/:id/stage/:team/complete
 * Body: { startISO?, endISO? }
 */
router.patch('/:id/stage/:team/complete', async (req, res) => {
  const { id, team } = req.params;
  const { startISO, endISO } = req.body;

  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const stage = project.stages.find(s => s.team === team);
  if (!stage) return res.status(400).json({ error: 'invalid team for this project' });

  stage.actual.start = startISO ? new Date(startISO) : stage.actual.start || new Date();
  stage.actual.end = endISO ? new Date(endISO) : new Date();
  stage.status = 'done';

  // advance pipeline
  const order = ['data', 'design', 'dev'];
  const idx = order.indexOf(team);
  if (idx === 2) {
    project.status = 'done';
    project.currentTeam = null;
  } else {
    project.status = `in_${order[idx + 1]}`;
    project.currentTeam = order[idx + 1];
  }

  await project.save();

  // expose computed virtuals
  const stageObj = stage.toObject({ virtuals: true });
  res.json({
    ok: true,
    penaltyHours: stageObj.penaltyHours,
    actualHours: stageObj.actualHours,
    project
  });
});

module.exports = router;
