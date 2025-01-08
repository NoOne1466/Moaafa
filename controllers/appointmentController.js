const catchAsync = require("./../utils/catchAsync");
const APIFeatures = require("./../utils/apiFeatures");
const Doctor = require("./../models/doctorModel");
const Appointment = require("./../models/appointmentModel.js");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory.js");

exports.getAllAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find();
    res.status(200).json({
      status: "success",
      data: {
        appointments,
      },
    });
  } catch (err) {
    return next(
      new AppError(
        "There was an error getting the appointments. Try again later!"
      ),
      500
    );
  }
};

exports.updateAppointmentStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  // Find the appointment by ID
  const appointment = await Appointment.findById(id);
  // Check if the signed in user is a doctor
  // console.log(req.doctor);
  // console.log(appointment.doctor.toHexString());
  // console.log(req.doctor.id);

  if (req.doctor.id !== appointment.doctor.toHexString()) {
    return next(
      new AppError(
        "The doctor signed in is not related to this appointment",
        401
      )
    );
  }
  // Update the status
  appointment.status = status;

  await appointment.save();

  res.status(200).json({
    status: "success",
    data: {
      appointment,
    },
  });
});

exports.cancelAppointment = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;
  const userId = req.user ? req.user.id : null;
  const doctorId = req.doctor ? req.doctor.id : null;
  const { reason } = req.body;

  // console.log("user ", userId, "doctor", doctorId);
  // Find the appointment in the database
  const appointment = await Appointment.findById(appointmentId);

  // Check if the appointment exists
  if (!appointment) {
    return next(
      new AppError("The id provided is not related to an appointment", 401)
    );
  }

  // Check if the user is authorized to cancel the appointment

  if (
    (userId && appointment.user._id.toString() !== userId) ||
    (doctorId && appointment.doctor._id.toString() !== doctorId)
  ) {
    return next(
      new AppError("You are not authorized to cancel this appointment", 401)
    );
  }

  // Update the appointment from the database
  if (userId) {
    appointment.status = "canceled";
    appointment.cancellationReason = reason;
    await appointment.save();
    console.log(appointment);
  } else if (doctorId) {
    appointment.status = "refused";
    appointment.cancellationReason = reason;
    await appointment.save();
  }

  req.appointment = appointment;

  res.status(201).json({
    status: "success",
    appointment,
  });
});

exports.getappointmentById = async (req, res, next) => {
  try {
    // Find the appointment by its ID
    const appointment = await Appointment.findById(req.params.id);

    // Check if the appointment exists
    if (!appointment) {
      return next(
        new AppError("There is no appointment with the provided ID"),
        404
      );
    }

    // If the appointment exists, return it
    res.status(200).json({ status: "success", data: { appointment } });
  } catch (error) {
    return next(
      new AppError(
        "There was an error getting the appointment, Please try again later!"
      ),
      404
    );
  }
};

exports.getCurrentDoctorAppointment = async (req, res, next) => {
  try {
    // Find appointments associated with the doctor's ID
    // console.log(req.doctor);
    const appointments = await Appointment.find({ doctor: req.doctor.id });

    // Check if appointments are found
    if (!appointments || appointments.length === 0) {
      return next(
        new AppError("There are no appointments for the current doctor"),
        404
      );
    }

    // If appointments are found, send them in the response
    res.status(200).json({ status: "success", data: { appointments } });
  } catch (error) {
    // Handle errors
    return next(
      new AppError("There was an error getting your appointments"),
      404
    );
  }
};

exports.getCurrentUserAppointment = async (req, res, next) => {
  try {
    // Find appointments associated with the doctor's ID
    const appointments = await Appointment.find({ user: req.user.id });
    // console.log(req.user)
    // Check if appointments are found
    if (!appointments || appointments.length === 0) {
      return next(
        new AppError("There are no appointments for the current user"),
        404
      );
    }

    // If appointments are found, send them in the response
    res.status(200).json({ status: "success", data: { appointments } });
  } catch (error) {
    // Handle errors
    return next(
      new AppError("There where an error getting your appointments"),
      404
    );
  }
};

exports.createAppointment = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findById(req.body.doctorId);

  console.log("doctor", doctor._id);
  console.log("user", req.user);

  if (!doctor) {
    return next(new AppError("No doctor found with that ID", 404));
  }

  let { slotId } = req.body;
  // startTime = roundToNearestHalfHour(new Date(startTime));
  // const parsedEndTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes after start time

  let slotMaxPatients;
  let selectedSlot = null;

  const slotAvailable = doctor.availableSlots.find((slot) => {
    console.log(slot._id.toString(), "====", slotId.toString());
    if (slot._id.toString() === slotId.toString()) {
      if (slot.maxPatients > 0) {
        selectedSlot = slot;
        slotMaxPatients = slot.maxPatients;
        slot.maxPatients -= 1; // Decrease maxPatients in the same loop
      }
    }
  });

  console.log(selectedSlot, "slot max patients", slotMaxPatients);

  if (!selectedSlot || slotMaxPatients <= 0) {
    console.log("error");
    return next(
      new AppError(
        "The requested time is outside of the doctor's working hours or Doctor can not recieve any more patients for now.",
        404
      )
    );
  }
  const appointment = new Appointment({
    user: req.user._id,
    doctor: doctor._id,
    hospital: selectedSlot.hospital,
    priceInCents: doctor.priceOfConsultationInCents || 10000,
    isPaid: false,
    day: selectedSlot.day,
    startTime: selectedSlot.startTime,
    endTime: selectedSlot.endTime,
  });
  await appointment.save();
  await doctor.save({ validateBeforeSave: false });
  res.status(201).json({
    status: "success",
    appointment,
  });
});
