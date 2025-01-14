const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  diagnosis: {
    type: String,
    default: null,
  },
  symptoms: {
    type: String,
    default: null,
  },
  medication: {
    type: String,
    default: null,
  },
  instructions: {
    type: String,
    default: null,
  },
  requests: [{ type: String, default: null }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  type: { Number },
  image: {
    type: [String],
    default: null,
  },
});

const Prescription = mongoose.model("Prescription", prescriptionSchema);

module.exports = Prescription;
