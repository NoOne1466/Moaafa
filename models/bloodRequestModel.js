// models/contactModel.js

const mongoose = require("mongoose");
const validator = require("validator");

const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
  },
  hospital: {
    type: String,
    required: true,
  },
  bloodType: {
    type: String,
    required: true,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },
  notes: {
    type: String,
    required: false,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const BloodRequest = mongoose.model("BloodRequest", bloodRequestSchema);
module.exports = BloodRequest;
