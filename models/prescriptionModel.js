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
    required: true,
  },
  symptoms: {
    type: String,
  },
  medication: {
    type: String,
  },
  instructions: {
    type: String,
  },
  requests: [{ type: String }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  type: Number,
  image: {
    type: [String],
  },
});

const Prescription = mongoose.model("Prescription", prescriptionSchema);

module.exports = Prescription;
