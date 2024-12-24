const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const pillScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  medicineName: { type: String, required: true },
  shape: { type: String, required: true },
  frequency: { type: String, required: true },
  dosage: { type: String, required: true },
  times: [{ type: String, required: true }],
  duration: { type: String, required: true },
  nextAlarm: [{ type: Date }, { type: Boolean }],
  notes: { type: String },
});

const PillScheduleSchema = mongoose.model(
  "PillScheduleSchema",
  pillScheduleSchema
);

module.exports = PillScheduleSchema;
