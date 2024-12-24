const catchAsync = require("./../utils/catchAsync");
const APIFeatures = require("./../utils/apiFeatures");
const Pill = require("./../models/pillScheduleModel.js");
const factory = require("./handlerFactory.js");
const AppError = require("../utils/appError.js");

exports.getAllPills = factory.getAll(Pill);

exports.getAllPillsForUser = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const pills = await Pill.find({ userId });
  res.status(201).json({
    status: "success",
    pills,
  });
});

exports.createPill = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { medicineName, dosage, frequency, duration, shape } = req.body;

  if (!medicineName || !dosage || !frequency || !duration || !shape) {
    return new AppError(
      "All fields are required: name, dosage, frequency, duration",
      400
    );
  }
  const pillSchedule = await Pill.create({
    userId,
    medicineName,
    dosage,
    frequency,
    duration,
    shape,
  });

  // Respond with success
  res.status(201).json({
    status: "success",
    data: { pillSchedule },
  });
});
