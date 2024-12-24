const catchAsync = require("../utils/catchAsync");
const BloodRequest = require("../models/bloodRequestModel");
const AppError = require("../utils/appError");
const factory = require("./../controllers/handlerFactory");

exports.getAllRequests = factory.getAll(BloodRequest);

exports.createBloodRequest = catchAsync(async (req, res, next) => {
  const { city, hospital, bloodType, notes } = req.body;

  console.log(req.body);
  if (!city || !hospital || !bloodType) {
    return new AppError("City, hospital, and blood type are required.", 400);
  }

  const bloodRequest = await BloodRequest.create({
    city,
    hospital,
    bloodType,
    notes,
    user: req.user._id, // Assuming `req.user` contains the logged-in user
  });

  res.status(201).json({
    status: "success",
    data: bloodRequest,
  });
});
