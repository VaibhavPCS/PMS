// src/utils/time.js
const Holiday = require('../models/Holiday');

function ymdUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function isWeekend(date) {
  const day = date.getUTCDay(); // 0=Sun,6=Sat
  return day === 0 || day === 6;
}

function inHolidaySet(date, holidaySet) {
  return holidaySet.has(ymdUTC(date));
}

// Count overlap hours for a single UTC day between [start, end)
function overlapHoursForDay(dayStart, start, end) {
  const dayEnd = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate() + 1, 0, 0, 0));
  // dayEnd points to 00:00:00 of next day — but we want end of this day 24h later
  // So compute nextDayStart:
  const nextDayStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate() + 1, 0, 0, 0));
  const from = start > dayStart ? start : dayStart;
  const to = end < nextDayStart ? end : nextDayStart;
  if (to <= from) return 0;
  return (to - from) / 36e5; // ms -> hours
}

/**
 * Compute working hours between two datetimes, skipping weekends and holidays.
 * - Counts full 24h weekday days; skips Sat/Sun entirely.
 * - Skips any date present in holidaySet (UTC date).
 * - Returns a number (hours), rounded to 2 decimals.
 */
function workingHoursBetween(startISO, endISO, holidaySet) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (!(start < end)) return 0;

  // Iterate day by day
  let hours = 0;
  // dayStart is midnight UTC of start date
  let dayStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0));

  while (dayStart < end) {
    const skip = isWeekend(dayStart) || inHolidaySet(dayStart, holidaySet);
    if (!skip) {
      hours += overlapHoursForDay(dayStart, start, end);
    }
    // next day
    dayStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate() + 1, 0, 0, 0));
  }

  return Math.round(hours * 100) / 100;
}

function hoursToParts(total) {
  const days = Math.floor(total / 24);
  const hours = Math.round((total - days * 24) * 100) / 100;
  return { days, hours };
}

async function getActiveHolidaySet() {
  const holidays = await Holiday.find({ active: true }).select('date').lean();
  const set = new Set();
  for (const h of holidays) {
    const d = new Date(h.date);
    set.add(ymdUTC(d));
  }
  return set;
}

module.exports = {
  workingHoursBetween,
  hoursToParts,
  getActiveHolidaySet,
};
