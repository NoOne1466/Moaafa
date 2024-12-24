const express = require("express");
const bloodRequestController = require("../controllers/bloodRequestController");
const authController = require("../controllers/authController");

const router = express.Router();

router
  .route("/")
  .get(authController.protect, bloodRequestController.getAllRequests)
  .post(authController.protect, bloodRequestController.createBloodRequest);

module.exports = router;
