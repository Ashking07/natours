const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

//name,email,photo,passwords, passwordConfirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email address!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Provide a Valid Email!']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'], //Only These many options can be selected for user
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please set a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Confirm your password'],
    validate: {
      //This only works on CREATE and SAVE!!!
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same.'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  //Only run this function if passwords was actually modified
  if (!this.isModified('password')) return next();

  //Hash Password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  //Deleting the validation password as we no longer need it. Basically we not wanna persist it to DB
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; //Think why we did substracted 1 sec here from the curr time
  next();
});

//Query middlewear, for eg not showing deleted user when fetching all users
userSchema.pre(/^find/, function(next) {
  //'this' points to the current query as it's a query middlewear
  this.find({ active: { $ne: false } });
  next();
});

//Here, the candidatePassword is the one coming from the user, bcrypt will simply hash it too and compare it to the already hashed password
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword); //returns a bool value
};
//Above is an static instance method, available on each document across the project, so we can call it anywhere.
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // 100 time created (JWTTimestamp) < 200 time last changed will return true
  }

  //False means not changed
  return false;
};

//Below is soo Cool!!!
userSchema.methods.createPasswordResetToken = function() {
  //This is sent to the user via email
  //Step1
  const resetToken = crypto.randomBytes(32).toString('hex');

  //Step2
  //This is saved to the DB
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  //Step 3
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
