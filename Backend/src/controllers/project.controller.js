const ProjectService = require('../services/project.service');

exports.listAll = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await ProjectService.listAll({ page, limit });
    res.json(data);
  } catch (e) { next(e); }
};

exports.listMine = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await ProjectService.listMine(req.user, { page, limit });
    res.json(data);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await ProjectService.getByIdWithAccess(req.user, req.params.id);
    res.json(project);
  } catch (e) { next(e); }
};


exports.createTest = async (req, res, next) => {
  try {
    const project = await ProjectService.createTestProject();
    res.status(201).json(project);
  } catch (e) { next(e); }
};

exports.estimateStage = async (req, res, next) => {
  try {
    const { id, team } = req.params;
    const { startISO, hours } = req.body;
    const project = await ProjectService.setEstimate(id, team, startISO, hours);
    res.json({ ok: true, project });
  } catch (e) { next(e); }
};

exports.completeStage = async (req, res, next) => {
  try {
    const { id, team } = req.params;
    const { startISO, endISO } = req.body;
    const result = await ProjectService.completeStage(id, team, startISO, endISO);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
};

exports.createProject = async (req, res, next) => {
  try {
    const project = await ProjectService.createProject(req.user, req.body);
    res.status(201).json(project);
  } catch (e) { next(e); }
};

exports.completeStage = async (req, res, next) => {
  try {
    const { id, team } = req.params;
    const { startISO, endISO } = req.body;
    const result = await ProjectService.completeStage(id, team, startISO, endISO);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
};