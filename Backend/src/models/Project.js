// src/models/Project.js
const mongoose = require('mongoose');

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

    // time set by team head (used for penalty)
    expected: {
      start: { type: Date },
      hours: { type: Number, min: 0 }
    },

    // time set by admin (only for charts/compare)
    adminExpected: {
      start: { type: Date },
      hours: { type: Number, min: 0 }
    },

    // actuals captured on completion
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

// Virtuals
StageSchema.virtual('actualHours').get(function () {
  if (!this.actual?.start || !this.actual?.end) return null;
  const ms = this.actual.end - this.actual.start;
  return Math.max(0, Math.round((ms / 36e5) * 100) / 100); // 2 decimals
});

StageSchema.virtual('penaltyHours').get(function () {
  if (this.actualHours == null || this.expected?.hours == null) return null;
  return Math.max(0, Math.round((this.actualHours - this.expected.hours) * 100) / 100);
});

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // overall status + which team is currently working
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
          return new Set(teams).size === teams.length; // no duplicate team entries
        },
        message: 'Duplicate stage team.'
      }
    }
  },
  { timestamps: true }
);

ProjectSchema.index({ title: 'text' });

module.exports = mongoose.model('Project', ProjectSchema);
