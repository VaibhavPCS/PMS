const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const { getActiveHolidaySet, workingHoursBetween, hoursToParts } = require('../utils/time');

function parseIntOr(val, d){ const n = parseInt(val,10); return Number.isFinite(n)&&n>0?n:d; }
function toHoursFromDaysHours(days, hours){ return Number(days||0)*24 + Number(hours||0); }
function orderOf(team){ return ['data','design','dev'].indexOf(team); }

function requireCurrentTeam(project, team){
  if (project.currentTeam !== team) { const e = new Error(`Stage ${team} is not the current team`); e.status = 409; throw e; }
}

async function resolveUserId(idOrEmail){
  if (!idOrEmail) return null;
  if (idOrEmail.includes && idOrEmail.includes('@')) {
    const u = await User.findOne({ email: idOrEmail }).select('_id');
    if (!u) { const e = new Error(`Head not found: ${idOrEmail}`); e.status = 400; throw e; }
    return u._id;
  }
  return new mongoose.Types.ObjectId(idOrEmail);
}

// Lists
exports.listAll = async ({ page=1, limit=10, status, team, search }) => {
  const lim = Math.min(parseIntOr(limit,10), 100);
  const skip = (parseIntOr(page,1)-1)*lim;

  const q = {};
  if (status) q.status = status;
  if (team) q['stages.team'] = team;
  if (search) q.$text = { $search: search };

  const [items, total] = await Promise.all([
    Project.find(q).sort({ createdAt:-1 }).skip(skip).limit(lim),
    Project.countDocuments(q)
  ]);
  return { items, page: parseIntOr(page,1), limit: lim, total, totalPages: Math.ceil(total/lim) };
};

exports.listMine = async (user, { page=1, limit=10 }) => {
  const lim = Math.min(parseIntOr(limit,10), 100);
  const skip = (parseIntOr(page,1)-1)*lim;
  const userId = new mongoose.Types.ObjectId(user.id);
  const q = user.role === 'admin' ? {} : { $or: [{ 'stages.head': userId }, { createdBy: userId }] };
  const [items, total] = await Promise.all([
    Project.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim),
    Project.countDocuments(q)
  ]);
  return { items, page: parseIntOr(page,1), limit: lim, total, totalPages: Math.ceil(total/lim) };
};

exports.getByIdWithAccess = async (user, id) => {
  const _id = new mongoose.Types.ObjectId(id);
  if (user.role === 'admin') {
    const p = await Project.findById(_id);
    if (!p) { const e = new Error('Project not found'); e.status = 404; throw e; }
    return p;
  }
  const p = await Project.findOne({ _id, $or: [{ 'stages.head': user.id }, { createdBy: user.id }] });
  if (!p) {
    const exists = await Project.exists({ _id });
    if (!exists) { const e = new Error('Project not found'); e.status = 404; throw e; }
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  return p;
};

// Create
exports.createProject = async (adminUser, payload) => {
  const { title, description, heads = {}, adminExpected = {} } = payload;
  if (!title) { const e = new Error('title is required'); e.status = 400; throw e; }

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
    title, description,
    createdBy: adminUser.id,
    status: 'in_data',
    currentTeam: 'data',
    stages
  });
};

// Stage estimate
exports.setEstimate = async (id, team, startISO, hours) => {
  const project = await Project.findById(id);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = project.stages.find(s => s.team === team);
  if (!stage) { const e = new Error('Invalid team'); e.status = 400; throw e; }
  if (stage.status === 'done') { const e = new Error('Stage already completed'); e.status = 409; throw e; }

  requireCurrentTeam(project, team);

  const start = startISO ? new Date(startISO) : new Date();
  if (Number(hours) <= 0) { const e = new Error('hours must be > 0'); e.status = 400; throw e; }

  stage.expected.start = start;
  stage.expected.hours = Number(hours);
  if (stage.status === 'pending') stage.status = 'in_progress';

  project.status = `in_${team}`;
  project.currentTeam = team;

  await project.save();
  return project;
};

// Stage complete
exports.completeStage = async (id, team, startISO, endISO) => {
  const project = await Project.findById(id);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = project.stages.find(s => s.team === team);
  if (!stage) { const e = new Error('Invalid team'); e.status = 400; throw e; }

  requireCurrentTeam(project, team);

  const start = new Date(startISO);
  const end = new Date(endISO);
  if (!(start < end)) { const e = new Error('endISO must be after startISO'); e.status = 400; throw e; }
  if (stage.status === 'done') { const e = new Error('Stage already completed'); e.status = 409; throw e; }

  stage.actual = { start, end };
  stage.status = 'done';

  const flow = ['data','design','dev'];
  const idx = orderOf(team);
  if (idx === flow.length - 1) {
    project.status = 'done'; project.currentTeam = null;
  } else {
    const nextTeam = flow[idx + 1];
    project.status = `in_${nextTeam}`; project.currentTeam = nextTeam;
  }

  await project.save();

  const holidaySet = await getActiveHolidaySet();
  const actualWorkingHours = workingHoursBetween(start, end, holidaySet);
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

// Admin schedule
exports.updateAdminExpected = async (id, team, { startISO, days = 0, hours = 0 }) => {
  const project = await Project.findById(id);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const stage = project.stages.find(s => s.team === team);
  if (!stage) { const e = new Error('Invalid team'); e.status = 400; throw e; }

  const totalHours = Number(days)*24 + Number(hours);
  if (totalHours < 0) { const e = new Error('Invalid adminExpected hours'); e.status = 400; throw e; }

  stage.adminExpected = {
    start: startISO ? new Date(startISO) : stage.adminExpected?.start,
    hours: totalHours
  };

  await project.save();
  return project;
};

// Notes helpers
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
function isAuthor(user, note) { return String(note.author) === String(user.id); }
function ensureStage(project, team) {
  const s = project.stages.find(x => x.team === team);
  if (!s) { const e=new Error('Invalid team'); e.status=400; throw e; }
  return s;
}

exports.listNotes = async (user, projectId, team) => {
  const project = await Project.findById(projectId).populate('stages.notes.author', 'name email role');
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
  if (!canReadProject(user, project)) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  const stage = ensureStage(project, team);
  return stage.notes.sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt));
};

exports.addNote = async (user, projectId, team, text) => {
  if (!text || !text.trim()) { const e = new Error('Text is required'); e.status = 400; throw e; }
  const project = await Project.findById(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
  const stage = ensureStage(project, team);
  if (!canWriteStage(user, project, stage)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  stage.notes.push({ author: user.id, text: text.trim() });
  await project.save();
  return stage.notes[stage.notes.length - 1];
};

exports.updateNote = async (user, projectId, team, noteId, text) => {
  if (!text || !text.trim()) { const e = new Error('Text is required'); e.status = 400; throw e; }
  const project = await Project.findById(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
  const stage = ensureStage(project, team);
  const note = stage.notes.id(noteId);
  if (!note) { const e = new Error('Note not found'); e.status = 404; throw e; }
  if (!(user.role === 'admin' || isAuthor(user, note))) { const e = new Error('Forbidden'); e.status = 403; throw e; }

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
  if (!(user.role === 'admin' || canWriteStage(user, project, stage) || isAuthor(user, note))) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  note.deleteOne();
  await project.save();
  return { ok: true };
};
