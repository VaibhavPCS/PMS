const ProjectService = require('../services/project.service');
const note = require('../controllers/note.controller');

exports.list = async (req, res, next) => {
  try {
    const { id, team } = req.params;
    const notes = await ProjectService.listNotes(req.user, id, team);
    res.json({ items: notes });
  } catch (e) { next(e); }
};

exports.add = async (req, res, next) => {
  try {
    const { id, team } = req.params;
    const { text } = req.body;
    const note = await ProjectService.addNote(req.user, id, team, text);
    res.status(201).json(note);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { id, team, noteId } = req.params;
    const { text } = req.body;
    const note = await ProjectService.updateNote(req.user, id, team, noteId, text);
    res.json(note);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { id, team, noteId } = req.params;
    const result = await ProjectService.deleteNote(req.user, id, team, noteId);
    res.json(result);
  } catch (e) { next(e); }
};
