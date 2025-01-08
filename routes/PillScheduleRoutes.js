const express = require("express");
const authController = require("../controllers/authController");
const PillController = require("../controllers/pillScheduleController");

const router = express.Router();

// router.route("/webhook").post(orderController.webhook);
router.use(authController.protect);

router
  .route("/")
  .get(PillController.getAllPillsForUser)
  .post(PillController.createPill);
router.route("/:id").patch(PillController.SetActive);

module.exports = router;
