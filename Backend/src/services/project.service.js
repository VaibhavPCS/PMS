const Project = require('../models/Project');
const mongoose = require('mongoose');
const User = require('../models/User');
const { getActiveHolidaySet, workingHoursBetween, hoursToParts } = require('../utils/time');

function asInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : fallback; // hard-cap limit=100
}

exports.listAll = async ({ page = 1, limit = 10 }) => {
  const skip = (asInt(page, 1) - 1) * asInt(limit, 10);
  const [items, total] = await Promise.all([
    Project.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(asInt(limit, 10)),
    Project.countDocuments({})
  ]);

  return {
    items,
    page: asInt(page, 1),
    limit: asInt(limit, 10),
    total,
    totalPages: Math.ceil(total / asInt(limit, 10))
  };
};

exports.listMine = async (user, { page = 1, limit = 10 }) => {
  const skip = (asInt(page, 1) - 1) * asInt(limit, 10);
  const userId = new mongoose.Types.ObjectId(user.id);

  const q = user.role === 'admin'
    ? {} // admins see everything
    : {
        $or: [
          { 'stages.head': userId }, // assigned as a head on any stage
          { createdBy: userId }      // or creator
        ]
      };

  const [items, total] = await Promise.all([
    Project.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(asInt(limit, 10)),
    Project.countDocuments(q)
  ]);

  return {
    items,
    page: asInt(page, 1),
    limit: asInt(limit, 10),
    total,
    totalPages: Math.ceil(total / asInt(limit, 10))
  };
};

exports.getByIdWithAccess = async (user, id) => {
  const _id = new mongoose.Types.ObjectId(id);

  if (user.role === 'admin') {
    const p = await Project.findById(_id);
    if (!p) throw new Error('Project not found');
    return p;
  }

  // Non-admin: must be assigned as head OR creator
  const p = await Project.findOne({
    _id,
    $or: [{ 'stages.head': user.id }, { createdBy: user.id }]
  });

  if (!p) {
    const exists = await Project.exists({ _id });
    if (!exists) throw new Error('Project not found');
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return p;
};

exports.createTestProject = async () => {
  const roles = ['admin', 'data_head', 'design_head', 'dev_head'];
  const users = {};
  for (const role of roles) {
    users[role] = await User.findOneAndUpdate(
      { email: `${role}@example.com` },
      { name: role.toUpperCase(), passwordHash: 'X', role },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  return Project.create({
    title: 'PMS Smoke Test',
    description: 'Created by service',
    createdBy: users.admin._id,
    status: 'in_data',
    currentTeam: 'data',
    stages: [
      { team: 'data', head: users.data_head._id },
      { team: 'design', head: users.design_head._id },
      { team: 'dev', head: users.dev_head._id }
    ]
  });
};

exports.setEstimate = async (id, team, startISO, hours) => {
  const project = await Project.findById(id);
  if (!project) throw new Error('Project not found');

  const stage = project.stages.find(s => s.team === team);
  if (!stage) throw new Error('Invalid team');

  stage.expected.start = startISO ? new Date(startISO) : new Date();
  stage.expected.hours = Number(hours);
  stage.status = 'in_progress';

  project.status = `in_${team}`;
  project.currentTeam = team;

  await project.save();
  return project;
};

exports.completeStage = async (id, team, startISO, endISO) => {
  const project = await Project.findById(id);
  if (!project) throw new Error('Project not found');

  const stage = project.stages.find(s => s.team === team);
  if (!stage) throw new Error('Invalid team');

  stage.actual.start = startISO ? new Date(startISO) : stage.actual.start || new Date();
  stage.actual.end = endISO ? new Date(endISO) : new Date();
  stage.status = 'done';

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
  return {
    project,
    actualHours: stage.actualHours,
    penaltyHours: stage.penaltyHours
  };
};

async function resolveUserId(idOrEmail) {
  if (!idOrEmail) return null;
  if (idOrEmail.includes && idOrEmail.includes('@')) {
    const u = await User.findOne({ email: idOrEmail }).select('_id');
    if (!u) throw new Error(`Head not found for email: ${idOrEmail}`);
    return u._id;
  }
  // assume ObjectId string
  return new mongoose.Types.ObjectId(idOrEmail);
}

function toHoursFromDaysHours(days, hours) {
  const d = Number(days || 0);
  const h = Number(hours || 0);
  return d * 24 + h;
}

exports.createProject = async (adminUser, payload) => {
  const { title, description, heads = {}, adminExpected = {} } = payload;
  if (!title) throw new Error('title is required');

  const dataHead = await resolveUserId(heads.data);
  const designHead = await resolveUserId(heads.design);
  const devHead = await resolveUserId(heads.dev);

  const stages = [];

  // helper to build stage with optional adminExpected
  function pushStage(team, headId, cfg) {
    const stage = { team, head: headId };
    if (cfg && (cfg.startISO || cfg.days || cfg.hours)) {
      stage.adminExpected = {
        start: cfg.startISO ? new Date(cfg.startISO) : undefined,
        hours: toHoursFromDaysHours(cfg.days, cfg.hours)
      };
    }
    stages.push(stage);
  }

  pushStage('data', dataHead, adminExpected.data);
  pushStage('design', designHead, adminExpected.design);
  pushStage('dev', devHead, adminExpected.dev);

  const project = await Project.create({
    title,
    description,
    createdBy: adminUser.id,
    status: 'in_data',
    currentTeam: 'data',
    stages
  });

  return project;
};

/**
 * replace your existing completeStage with this enhanced version
 * (uses working hours skipping weekends/holidays for penalty calc)
 */
exports.completeStage = async (id, team, startISO, endISO) => {
  const project = await Project.findById(id);
  if (!project) throw new Error('Project not found');

  const stage = project.stages.find(s => s.team === team);
  if (!stage) throw new Error('Invalid team');

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

  // penalty/actual using working-hours (skip weekends + holidays)
  const holidaySet = await getActiveHolidaySet();
  const actualWorkingHours = workingHoursBetween(stage.actual.start, stage.actual.end, holidaySet);
  const headExpected = Number(stage.expected?.hours || 0);
  const penaltyHours = Math.max(0, Math.round((actualWorkingHours - headExpected) * 100) / 100);

  return {
    project,
    actualHours: actualWorkingHours,
    actualParts: hoursToParts(actualWorkingHours),
    headExpectedHours: headExpected,
    headExpectedParts: hoursToParts(headExpected),
    penaltyHours
  };
};