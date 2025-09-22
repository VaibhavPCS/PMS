const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const { getActiveHolidaySet, workingHoursBetween, hoursToParts } = require('../utils/time');

function asInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : fallback;
}

exports.listAll = async ({ page = 1, limit = 10 }) => {
  const lim = asInt(limit, 10);
  const skip = (asInt(page, 1) - 1) * lim;
  const [items, total] = await Promise.all([
    Project.find({}).sort({ createdAt: -1 }).skip(skip).limit(lim),
    Project.countDocuments({})
  ]);
  return { items, page: asInt(page, 1), limit: lim, total, totalPages: Math.ceil(total / lim) };
};

exports.listMine = async (user, { page = 1, limit = 10 }) => {
  const lim = asInt(limit, 10);
  const skip = (asInt(page, 1) - 1) * lim;
  const userId = new mongoose.Types.ObjectId(user.id);
  const q = user.role === 'admin' ? {} : { $or: [{ 'stages.head': userId }, { createdBy: userId }] };
  const [items, total] = await Promise.all([
    Project.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim),
    Project.countDocuments(q)
  ]);
  return { items, page: asInt(page, 1), limit: lim, total, totalPages: Math.ceil(total / lim) };
};

exports.getByIdWithAccess = async (user, id) => {
  const _id = new mongoose.Types.ObjectId(id);
  if (user.role === 'admin') {
    const p = await Project.findById(_id);
    if (!p) throw new Error('Project not found');
    return p;
  }
  const p = await Project.findOne({ _id, $or: [{ 'stages.head': user.id }, { createdBy: user.id }] });
  if (!p) {
    const exists = await Project.exists({ _id });
    if (!exists) throw new Error('Project not found');
    const err = new Error('Forbidden'); err.status = 403; throw err;
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

async function resolveUserId(idOrEmail) {
  if (!idOrEmail) return null;
  if (idOrEmail.includes && idOrEmail.includes('@')) {
    const u = await User.findOne({ email: idOrEmail }).select('_id');
    if (!u) throw new Error(`Head not found for email: ${idOrEmail}`);
    return u._id;
  }
  return new mongoose.Types.ObjectId(idOrEmail);
}

// function toHoursFromDaysHours(days, hours) {
//   const d = Number(days || 0);
//   const h = Number(hours || 0);
//   return d * 24 + h;
// }

// ensure toHoursFromDaysHours helper exists in this file
function toHoursFromDaysHours(days, hours) {
  const d = Number(days || 0);
  const h = Number(hours || 0);
  return d * 24 + h;
}

exports.updateAdminExpected = async (id, team, { startISO, days, hours }) => {
  const project = await Project.findById(id);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = project.stages.find(s => s.team === team);
  if (!stage) { const e = new Error('Invalid team'); e.status = 400; throw e; }

  // Compute new values if provided; otherwise keep previous ones
  const hasHoursInput = days != null || hours != null;
  const newHours = hasHoursInput ? toHoursFromDaysHours(days, hours) : stage.adminExpected?.hours;
  const newStart = startISO ? new Date(startISO) : stage.adminExpected?.start;

  stage.adminExpected = {
    start: newStart,
    hours: newHours
  };

  // Do NOT flip status or currentTeam here; admin schedule is informational
  await project.save();
  return project;
};


exports.createProject = async (adminUser, payload) => {
  const { title, description, heads = {}, adminExpected = {} } = payload;
  if (!title) throw new Error('title is required');

  const dataHead = await resolveUserId(heads.data);
  const designHead = await resolveUserId(heads.design);
  const devHead = await resolveUserId(heads.dev);

  const stages = [];
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

  return Project.create({
    title,
    description,
    createdBy: adminUser.id,
    status: 'in_data',
    currentTeam: 'data',
    stages
  });
};

// exports.completeStage = async (id, team, startISO, endISO) => {
//   // DEBUG marker so you can see in logs which implementation is running
//   console.log('[completeStage] using working-hours calc');

//   const project = await Project.findById(id);
//   if (!project) throw new Error('Project not found');

//   const stage = project.stages.find(s => s.team === team);
//   if (!stage) throw new Error('Invalid team');

//   stage.actual.start = startISO ? new Date(startISO) : stage.actual.start || new Date();
//   stage.actual.end = endISO ? new Date(endISO) : new Date();
//   stage.status = 'done';

//   const order = ['data', 'design', 'dev'];
//   const idx = order.indexOf(team);
//   if (idx === 2) { project.status = 'done'; project.currentTeam = null; }
//   else { project.status = `in_${order[idx + 1]}`; project.currentTeam = order[idx + 1]; }

//   await project.save();

//   const holidaySet = await getActiveHolidaySet();
//   const actualWorkingHours = workingHoursBetween(stage.actual.start, stage.actual.end, holidaySet);

//   const headExpected = Number(stage.expected?.hours || 0);
//   const penaltyHours = Math.max(0, Math.round((actualWorkingHours - headExpected) * 100) / 100);

//   return {
//     project,
//     actualHours: actualWorkingHours,
//     actualParts: hoursToParts(actualWorkingHours),
//     headExpectedHours: headExpected,
//     headExpectedParts: hoursToParts(headExpected),
//     penaltyHours
//   };
// };

exports.completeStage = async (id, team, startISO, endISO) => {
  console.log('[completeStage] using working-hours calc');

  const project = await Project.findById(id);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = project.stages.find(s => s.team === team);
  if (!stage) { const e = new Error('Invalid team'); e.status = 400; throw e; }

  // 🚫 NEW: must have a head estimate before completion
  if (!(stage.expected && Number.isFinite(stage.expected.hours) && stage.expected.hours >= 0)) {
    const e = new Error('Stage must have an estimate (expected.hours) before completion');
    e.status = 400; throw e;
  }

  stage.actual.start = startISO ? new Date(startISO) : stage.actual.start || new Date();
  stage.actual.end   = endISO   ? new Date(endISO)   : new Date();
  stage.status = 'done';

  const order = ['data', 'design', 'dev'];
  const idx = order.indexOf(team);
  if (idx === 2) { project.status = 'done'; project.currentTeam = null; }
  else { project.status = `in_${order[idx + 1]}`; project.currentTeam = order[idx + 1]; }

  await project.save();

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


// function ensureStage(project, team) {
//   const stage = project.stages.find((s) => s.team === team);
//   if (!stage) {
//     const err = new Error('Invalid team'); err.status = 400; throw err;
//   }
//   return stage;
// }

function ensureStage(project, team) {
  const s = project.stages.find(x => x.team === team);
  if (!s) { const e=new Error('Invalid team'); e.status=400; throw e; }
  return s;
}

function ensureCurrentTeam(project, team) {
  if (project.currentTeam !== team) {
    const e = new Error(`Stage '${team}' is not active`); e.status = 400; throw e;
  }
}

function canReadProject(user, project) {
  if (user.role === 'admin') return true;
  const uid = String(user.id);
  if (String(project.createdBy) === uid) return true;
  return project.stages.some(s => String(s.head) === uid);
}

function canWriteStage(user, project, stage) {
  if (user.role === 'admin') return true;
  return String(stage.head) === String(user.id);
}

function isAuthor(user, note) {
  return String(note.author) === String(user.id);
}

exports.listNotes = async (user, projectId, team) => {
  const project = await Project.findById(projectId).populate('stages.notes.author', 'name email role');
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  if (!canReadProject(user, project)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  const stage = ensureStage(project, team);
  return stage.notes
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // ascending
};

exports.addNote = async (user, projectId, team, text) => {
  if (!text || !text.trim()) { const e = new Error('Text is required'); e.status = 400; throw e; }

  const project = await Project.findById(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = ensureStage(project, team);
  if (!canWriteStage(user, project, stage)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  stage.notes.push({ author: user.id, text: text.trim() });
  await project.save();

  const note = stage.notes[stage.notes.length - 1];
  return note;
};

exports.updateNote = async (user, projectId, team, noteId, text) => {
  if (!text || !text.trim()) { const e = new Error('Text is required'); e.status = 400; throw e; }

  const project = await Project.findById(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = ensureStage(project, team);
  const note = stage.notes.id(noteId);
  if (!note) { const e = new Error('Note not found'); e.status = 404; throw e; }

  // Only admin or author can edit
  if (!(user.role === 'admin' || isAuthor(user, note))) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }

  note.text = text.trim();
  await project.save();
  return note;
};

exports.deleteNote = async (user, projectId, team, noteId) => {
  const project = await Project.findById(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = ensureStage(project, team);
  const note = stage.notes.id(noteId);
  if (!note) { const e = new Error('Note not found'); e.status = 404; throw e; }

  // Admin can delete any; stage head can delete own; authors can delete own
  if (!(user.role === 'admin' || canWriteStage(user, project, stage) || isAuthor(user, note))) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }

  note.deleteOne();
  await project.save();
  return { ok: true };
};

async function resolveUserId(idOrEmail) {
  if (!idOrEmail) return null;
  if (idOrEmail.includes && idOrEmail.includes('@')) {
    const u = await User.findOne({ email: idOrEmail }).select('_id');
    if (!u) { const e = new Error(`Head not found: ${idOrEmail}`); e.status = 400; throw e; }
    return u._id;
  }
  return new mongoose.Types.ObjectId(idOrEmail);
}

exports.updateHeads = async (id, { data, design, dev }) => {
  const p = await Project.findById(id);
  if (!p) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const map = { data, design, dev };
  for (const stage of p.stages) {
    const val = map[stage.team];
    if (val !== undefined) stage.head = val ? await resolveUserId(val) : null;
  }
  await p.save();
  return p;
};