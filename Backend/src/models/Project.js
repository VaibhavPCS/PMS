// src/models/Project.js
const mongoose = require('mongoose');
const { workingHoursBetween, hoursToParts, getActiveHolidaySet } = require('../utils/time');

const FileSchema = new mongoose.Schema(
  {
    filename: String,
    url: String,
    size: Number,
    mime: String
  },
  { _id: false }
);

const StageSchema = new mongoose.Schema(
  {
    team: { type: String, enum: ['data', 'design', 'dev'], required: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expected: {
      start: { type: Date },
      hours: { type: Number, min: 0 }
    },
    adminExpected: {
      start: { type: Date },
      hours: { type: Number, min: 0 }
    },
    actual: {
      start: { type: Date },
      end: { type: Date }
    },
    notes: { type: String },
    attachments: [FileSchema],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      default: 'pending'
    }
  },
  { _id: false, timestamps: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['queued', 'in_data', 'in_design', 'in_dev', 'done'],
      default: 'queued'
    },
    currentTeam: { type: String, enum: ['data', 'design', 'dev', null], default: null },
    stages: {
      type: [StageSchema],
      validate: {
        validator(v) {
          const teams = v.map(s => s.team);
          return new Set(teams).size === teams.length;
        },
        message: 'Duplicate stage team.'
      }
    }
  },
  { timestamps: true }
);

// 👇 Custom transform: inject computed fields into JSON automatically
ProjectSchema.set('toJSON', {
  virtuals: true,
  transform: async function (doc, ret) {
    if (ret.stages) {
      const holidaySet = await getActiveHolidaySet();
      ret.stages = ret.stages.map(stage => {
        if (stage.actual?.start && stage.actual?.end) {
          const actualHours = workingHoursBetween(stage.actual.start, stage.actual.end, holidaySet);
          stage.actualHours = actualHours;
          stage.actualParts = hoursToParts(actualHours);
          if (stage.expected?.hours != null) {
            stage.headExpectedHours = stage.expected.hours;
            stage.headExpectedParts = hoursToParts(stage.expected.hours);
            stage.penaltyHours = Math.max(0, actualHours - stage.expected.hours);
          }
        }
        return stage;
      });
    }
    return ret;
  }
});

module.exports = mongoose.model('Project', ProjectSchema);
