const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true }, // exact calendar date
    name: { type: String, required: true },             // e.g. "Independence Day"
    type: { type: String, enum: ['company', 'national'], required: true },
    active: { type: Boolean, default: true }            // admin can toggle
  },
  { timestamps: true }
);

// Ensures we don’t double-create same holiday date
HolidaySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', HolidaySchema);
