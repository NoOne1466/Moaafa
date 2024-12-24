const { PaymentGateway, paymobAPI } = require("../services/PaymentGetaway.js");
const Order = require("../models/orderModel");
const Doctor = require("../models/doctorModel");
const User = require("../models/userModel.js");

const Appointment = require("../models/appointmentModel.js");

const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const fs = require("fs");

// const roundToNearestHalfHour = (date) => {
//   const minutes = date.getMinutes();
//   if (minutes < 15) {
//     date.setMinutes(0, 0, 0);
//   } else if (minutes < 45) {
//     date.setMinutes(30, 0, 0);
//   } else {
//     date.setMinutes(0, 0, 0);
//     date.setHours(date.getHours() + 1);
//   }
//   return date;
// };

// const isWithinWorkingHours = (startTime, availableSlots) => {
//   const now = new Date();
//   const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Current time + 2 hours

//   if (startTime < twoHoursFromNow) {
//     return [false, null];
//   }

//   const dayOfWeek = startTime.getDay(); // Sunday - Saturday : 0 - 6
//   const dayName = [
//     "sunday",
//     "monday",
//     "tuesday",
//     "wednesday",
//     "thursday",
//     "friday",
//     "saturday",
//   ][dayOfWeek];

//   const workingDay = availableSlots.find((slot) => slot.day === dayName);
//   console.log("time requested", startTime);
//   console.log("the whole day ", workingDay);
//   if (!workingDay) return false;

//   const [startHour, startMinute] = workingDay.startTime.split(":").map(Number);
//   const [endHour, endMinute] = workingDay.endTime.split(":").map(Number);

//   const workingStartTime = new Date(startTime);
//   workingStartTime.setHours(startHour + 3, startMinute, 0, 0);
//   console.log("working start time ", workingStartTime);
//   const workingEndTime = new Date(startTime);
//   workingEndTime.setHours(endHour + 3, endMinute, 0, 0);
//   console.log("working end time ", workingEndTime);

//   const isWithinWorkingHours =
//     startTime >= workingStartTime && startTime < workingEndTime;
//   return [isWithinWorkingHours, workingDay];
// };

exports.getAll = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Order.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query;

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

exports.createOrderByDoctor = catchAsync(async (req, res, next) => {
  const order = new Order({
    user: req.body.userId,
    doctor: req.user._id,
    hospital: req.body.hospital,
    priceInCents: req.body.priceInCents || 10000,
    isPaid: true,
    day: req.body.day,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
  });
  await order.save();

  res.status(201).json({
    status: "success",
    order,
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
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

  const order = new Order({
    user: req.user._id,
    doctor: doctor._id,
    hospital: selectedSlot.hospital,
    priceInCents: doctor.priceOfConsultationInCents || 10000,
    isPaid: false,
    day: selectedSlot.day,
    startTime: selectedSlot.startTime,
    endTime: selectedSlot.endTime,
  });
  await order.save();

  await doctor.save({ validateBeforeSave: false });

  const paymentGateway = new PaymentGateway(
    paymobAPI,
    process.env.API_KEY,
    process.env.INTEGRATION_ID
  );
  await paymentGateway.getToken();

  const paymobOrder = await paymentGateway.createOrder({
    id: order._id,
    priceInCents: order.priceInCents,
    name: doctor.firstName,
    description: "Consultation",
  });

  console.log(req.user);

  const paymentToken = await paymentGateway.createPaymentGateway({
    uEmail: req.user.email,
    uFirstName: req.user.firstName,
    uLastName: req.user.lastName,
    uPhoneNumber: req.user.phoneNumber,
  });
  order.orderId = paymobOrder.id;

  await User.findByIdAndUpdate(req.user._id, {
    $push: { orders: order._id },
  });
  await Doctor.findByIdAndUpdate(req.body.doctorId, {
    $push: { orders: order._id },
  });

  const paymentURL = process.env.IFRAME_URL.replace("{{TOKEN}}", paymentToken);

  res.status(201).json({
    status: "success",
    data: paymentURL,
  });
});

exports.refund = catchAsync(async (req, res, next) => {
  const appointment = req.appointment;
  console.log("the appointment: ", appointment);
  // Update appointment to canceled
  const order = await Order.findOne({
    user: appointment.user._id,
    doctor: appointment.doctor._id,
    isPaid: true,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
  });
  console.log("The order: ", order);

  if (!order) {
    return next(new AppError("No order found for this appointment", 404));
  }

  const paymentGateway = new PaymentGateway(
    paymobAPI,
    process.env.API_KEY,
    process.env.INTEGRATION_ID
  );

  await paymentGateway.getToken();

  const refund = await paymentGateway.createRufund(
    order.transactionId,
    order.priceInCents
  );

  order.isPaid = false;
  order.refundedAt = Date.now();
  await order.save();

  res.status(200).json({
    status: "Appointment cancelled and refund processed successfully",
    data: refund,
  });
});

// exports.webhook = catchAsync(async (req, res, next) => {
//   const paymobAns = req.body;
//   const hmac = req.query.hmac;

//   if (!hmac) return next(new AppError("HMAC is required", 400));
//   if (!paymobAns) return next(new AppError("Invalid request", 400));
//   if (!PaymentGateway.verifyHmac(paymobAns, hmac, process.env.HMAC_SECRET))
//     return next(new AppError("Invalid HMAC", 400));

//   if (paymobAns.type !== "TRANSACTION") {
//     return res.status(200).json({
//       status: "success",
//     });
//   }
//   if (paymobAns.obj.success !== true)
//     return next(new AppError("Transaction failed", 400));

//   const orderId = paymobAns?.obj?.order?.merchant_order_id;
//   let order;

//   order = await Order.findByIdAndUpdate(
//     orderId,
//     {
//       isPaid: true,
//       transactionId: paymobAns?.obj?.id,
//       paidAt: Date.now(),
//     },
//     {
//       new: true,
//       runValidators: true,
//     }
//   );

//   if (!order) {
//     return next(new AppError("Order not found", 404));
//   }

//   const appointment = new Appointment({
//     user: order.user,
//     doctor: order.doctor,
//     startTime: order.startTime,
//     endTime: order.endTime,
//     status: "pending",
//   });

//   await appointment.save();

//   return res.status(200).json({
//     status: "success",
//   });
// });
