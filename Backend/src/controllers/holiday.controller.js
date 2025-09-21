const Holiday = require('../models/Holiday');

// Add one holiday
exports.addHoliday = async (req, res, next) => {
  try {
    const { date, name, type } = req.body;
    if (!date || !name || !type) return res.status(400).json({ error: 'Missing fields' });

    const holiday = await Holiday.create({ date, name, type });
    res.status(201).json(holiday);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'Holiday already exists for this date' });
    }
    next(e);
  }
};

// List all holidays
exports.listHolidays = async (req, res, next) => {
  try {
    const holidays = await Holiday.find({ active: true }).sort({ date: 1 });
    res.json(holidays);
  } catch (e) { next(e); }
};

// Toggle or remove
exports.updateHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, active } = req.body;

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { name, type, active },
      { new: true }
    );

    if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
    res.json(holiday);
  } catch (e) { next(e); }
};
