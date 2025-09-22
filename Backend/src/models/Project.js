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

const NoteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text:   { type: String, required: true, trim: true, maxlength: 2000 }
  },
  { _id: true, timestamps: true }
);

const StageSchema = new mongoose.Schema(
  {
    team:  { type: String, enum: ['data', 'design', 'dev'], required: true },
    head:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // time set by team head (used for penalty)
    expected: {
      start: { type: Date },
      hours: { type: Number, min: 0 }
    },

    // time set by admin (for charts/compare)
    adminExpected: {
      start: { type: Date },
      hours: { type: Number, min: 0 }
    },

    // actuals captured on completion
    actual: {
      start: { type: Date },
      end:   { type: Date }
    },

    // 🔽 threaded notes instead of plain string
    notes: { type: [NoteSchema], default: [] },

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
    title:       { type: String, required: true, trim: true },
    description: { type: String },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: ['queued', 'in_data', 'in_design', 'in_dev', 'done'],
      default: 'queued'
    },

    currentTeam: { type: String, enum: ['data', 'design', 'dev', null], default: null },

    // one stage per team
    stages: {
      type: [StageSchema],
      validate: {
        validator(v) {
          const teams = v.map(s => s.team);
          return new Set(teams).size === teams.length; // no duplicates
        },
        message: 'Duplicate stage team.'
      }
    }
  },
  { timestamps: true }
);

// ❌ don’t make this async — Mongoose ignores async transforms
ProjectSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    if (ret.stages) {
      ret.stages = ret.stages.map(stage => {
        if (stage.actual?.start && stage.actual?.end) {
          // NOTE: holiday-aware hours are already calculated in service layer
          const rawHours = (new Date(stage.actual.end) - new Date(stage.actual.start)) / 36e5;
          const actualHours = Math.max(0, Math.round(rawHours * 100) / 100);

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
