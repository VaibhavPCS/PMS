const User = require('../models/User');

exports.listActive = async (req, res, next) => {
  try {
    const { role } = req.query;
    const q = { active: true };
    if (role) q.role = role;
    const users = await User.find(q).select('_id name email role').sort({ name: 1 });
    res.json({
      items: users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role }))
    });
  } catch (e) { next(e); }
};

