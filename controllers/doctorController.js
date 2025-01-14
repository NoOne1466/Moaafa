const catchAsync = require("./../utils/catchAsync");
const APIFeatures = require("./../utils/apiFeatures");
const Doctor = require("./../models/doctorModel");
const factory = require("./handlerFactory.js");
const AppError = require("../utils/appError.js");
const mongoose = require("mongoose");

exports.getDoctor = factory.getOne(Doctor);
exports.getAllDoctors = factory.getAll(Doctor);

// Do NOT update passwords with this!
exports.updateDoctor = factory.updateOne(Doctor);
exports.deleteDoctor = factory.deleteOne(Doctor);

// exports.createDoctor = factory.createOne(Doctor);

exports.getDoctorById = factory.getOne(Doctor);
exports.updateMe = factory.updateMe(Doctor);
exports.deleteMe = factory.deleteMe(Doctor);
exports.getMe = factory.getMe;

exports.homePage = factory.homePage;

exports.updateSlot = catchAsync(async (req, res, next) => {
  const { slotId } = req.params;
  const doctorId = req.user.id;
  const { day, startTime, endTime, hospital, maxPatients } = req.body;

  const doctor = await Doctor.findOneAndUpdate(
    { _id: doctorId, "availableSlots._id": slotId },
    {
      $set: {
        "availableSlots.$.day": day,
        "availableSlots.$.startTime": startTime,
        "availableSlots.$.endTime": endTime,
        "availableSlots.$.hospital": new mongoose.Types.ObjectId(hospital), // Use 'new' here
        "availableSlots.$.maxPatients": maxPatients,
      },
    },
    { new: true, runValidators: true }
  );

  if (!doctor) {
    return next(new AppError("Doctor not found or slot not found", 404));
  }

  res.status(200).json({ message: "Slot updated successfully", doctor });
});

exports.deleteSlot = catchAsync(async (req, res, next) => {
  const { slotId } = req.params;
  const doctorId = req.user.id;

  const doctor = await Doctor.findByIdAndUpdate(
    doctorId,
    { $pull: { availableSlots: { _id: slotId } } },
    { new: true }
  );

  if (!doctor) {
    return next(new AppError("Doctor not found or slot not found", 404));
  }

  res.status(200).json({ message: "Slot deleted successfully", doctor });
});

exports.searchDoctorsByHospital = catchAsync(async (req, res, next) => {
  const hospitalId = req.params.hospitalId;

  // Validate the hospital ID
  if (!hospitalId) {
    return next(new AppError("Hospital ID is required."), 404);
  }

  // Search doctors with available slots in the specified hospital
  const doctors = await Doctor.find({
    "availableSlots.hospital": new mongoose.Types.ObjectId(hospitalId),
  });

  // If no doctors found, return an empty array or a suitable message
  if (doctors.length === 0) {
    return next(
      new AppError("No doctors found with available slots in this hospital."),
      404
    );
  }

  // Return the list of doctors
  return res.status(200).json({
    status: "success",
    length: doctors.length,
    doctors,
  });
});
