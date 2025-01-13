const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please tell us your first name!"],
    },
    lastName: {
      type: String,
      required: [true, "Please tell us your last name!"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    photo: {
      type: String,
      default: "img/default.jpg",
    },
    dateOfBirth: Date,
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same!",
      },
    },
    medicalRecord: {
      type: String,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],

    location: String,
    phoneNumber: {
      type: Number,
      default: null,
    },
    idNumber: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return /^\d{14}$/.test(value);
        },
        message: (props) => `${props.value} is not an id number!`,
      },
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: null,
    },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"],
      default: "Single",
    },
    family: {
      type: [mongoose.Schema.Types.ObjectId], // Array of ObjectIDs
      ref: "User", // Reference to the 'User' collection
    },
    spouseIds: {
      type: [mongoose.Schema.Types.ObjectId], // Array of ObjectIDs
      ref: "User", // Reference to the 'User' collection
      validate: {
        validator: function (value) {
          return (
            this.a !== "Married" || (Array.isArray(value) && value.length > 0)
          );
        },
        message:
          'At least one spouseId is required if maritalStatus is "Married".',
      },
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
      default: null,
    },
    height: {
      record: {
        type: Number,
        // required: [true, "Please provide a height value"],
        default: null,
      },
      unit: {
        type: String,
        enum: ["cm", "ft"],
        // required: [true, "Please specify the height unit"],
        default: "cm",
      },
      notes: {
        type: String,
        default: "",
      },
    },
    weight: {
      record: {
        type: Number,
        // required: [true, "Please provide a weight value"],
        default: null,
      },
      unit: {
        type: String,
        enum: ["kg", "lb"],
        // required: [true, "Please specify the weight unit"],
        default: "kg",
      },
      notes: {
        type: String,
        default: "",
      },
    },
    bloodSugar: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetOtp: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate
// userSchema.virtual("reviews", {
//   ref: "ReviewUsers",
//   foreignField: "user",
//   localField: "_id",
// });

userSchema.virtual("favorites", {
  ref: "Favorite",
  foreignField: "user",
  localField: "_id",
});

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // console.log(this);
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const otp = Math.floor(100000 + Math.random() * 900000);

  this.passwordResetOtp = crypto
    .createHash("sha256")
    .update(otp.toString())
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // console.log(
  //   { resetToken, otp },
  //   this.passwordResetToken,
  //   this.passwordResetOtp
  // );

  return otp;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
