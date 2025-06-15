const crypto = require('crypto');

const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('./../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToke = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, //So that cookie cannot be accessed/modified by any browser. Prevents cross site scripting attacks
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https' //This is how we check if our app is secure or not when using heroku
  });

  //Remove password from output
  user.password = undefined;

  //Below we are attaching 'user' on to the response, after login, this user will be available to each subsequent request in the call stack.
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body);

  //With this new code, we only allow the specified fields to be uploaded to our DB
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt
    // role: req.body.role //I'm sceptic about leaving this here, as anyone can specify in req.body that their role is of user, but without doing this, even I'm not able to set an user to admin
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();

  //Here, the ._id is the id provided by mongoDB automatically
  createSendToke(newUser, 201, req, res);
  // const token = signToken(newUser._id);

  // res.status(201).json({
  //   status: 'sucess',
  //   token,
  //   data: {
  //     user: newUser
  //   }
  // });
});

// exports.login = catchAsync(async (req, res, next) => {
//   const { email, password } = req.body;

//   //1) Check if email and passwords exist
//   if (!email || !password) {
//     return next(new AppError('Please Provie email and password!', 400));
//   }
//   //2) Check if the user exist && password is correct
//   //Storing the user's email and pass stored on DB, on user object
//   const user = await User.findOne({ email }).select('+password'); //As we made password field excluded in the response in userModel, so we have to explicitly select it with +. This is a user document

//   //Below, 'password' is the one given by user trying to log in, then 'user.password' is the encrypted on stored in DB
//   if (!user || !(await user.correctPassword(password, user.password))) {
//     return next(new AppError('Incorrect email or password', 401));
//   }

//   //3) If everything ok, send JWT token back to client
//   createSendToke(user, 200, res);
// });

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //NEW ADDITION
  const rawToken = `${Math.floor(100000 + Math.random() * 900000)}`;
  user.multFAToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  user.multFATokenExpires = Date.now() + 10 * 60 * 1000; // 10-min TTL
  await user.save({ validateBeforeSave: false });

  const url = `${req.protocol}://${req.get('host')}/verify-2fa/${rawToken}`;
  await new Email(user, url).sendMultFAA();

  res.status(200).json({
    status: 'pending',
    message: 'MultFA code sent to email.'
  });
  //

  // 3) If everything ok, send token to client
  // createSendToke(user, 200, req, res);
});

exports.verifyMultFA = catchAsync(async (req, res, next) => {
  const hashed = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    multFAToken: hashed,
    multFATokenExpires: { $gt: Date.now() }
  });

  if (!user) return next(new AppError('Token invalid or expired', 400));

  user.isMultFAVerified = true;
  user.multFAToken = undefined;
  user.multFATokenExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // **Now** issue the real JWT
  createSendToke(user, 200, req, res);
});

// checks whether the user has completed the e-mail MFA step
exports.requireMultFA = (req, res, next) => {
  // req.user is set by authController.protect
  if (!req.user || !req.user.isMultFAVerified) {
    return next(
      new AppError(
        'Please finish two-factor authentication before accessing this resource.',
        403
      )
    );
  }
  next();
};
//NEW ADDITION till here

// exports.logout = (req, res) => {
//   //Below we are sending another cookie to the browser with same name as earlier which had used to login 'called as jwt' so it'll override the earlier one,
//   //But with the difference that this dosen't contain the token, so it will be invaild, hence logging out our user
//   res.cookie('jwt', 'loggedout', {
//     expires: new Date(Date.now() + 10 * 1000),
//     httpOnly: true
//   });
//   res.status(200).json({
//     status: 'success'
//   });
// };

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1)Getting the JWT token, check if it exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; // console.log(req.headers.authorization); - accessing the 2nd part of what is in the authorization
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    //If client didn't sent token, they aren't logged in
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    );
  }
  //2) Verification token: Super imp: checks if the token has be manipulated
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); //Token was created using the JWT_SECRET in the createSendToke(), here we are checking if the provided token is valid using the same JWT_SECRET.

  //3) Check if user still exist
  const currentUser = await User.findById(decoded.id); //Remember we used user id to create the token in createSendToke, so we have access to the users id
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exist!', 401)
    );
  }

  //4)Check if user changed password after JWT token was issued, in case someone got access to our token, we changed the password/logged out.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please login again', 401)
    );
  }

  //Grant Access To Protected Route If Everything Above Went Well
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
// exports.isLoggedIn = async (req, res, next) => {
//   if (req.cookies.jwt) {
//     try {
//       //1) Verify token
//       const decoded = await promisify(jwt.verify)(
//         req.cookies.jwt,
//         process.env.JWT_SECRET
//       ); //Token was created using the JWT_SECRET in the createSendToke(), here we are checking if the provided token is valid using the same JWT_SECRET.

//       //2) Check if user still exist
//       const currentUser = await User.findById(decoded.id); //Remember we used user id to create the token in createSendToke, so we have access to the users id
//       if (!currentUser) {
//         return next();
//       }

//       //4)Check if user changed password after JWT token was issued, in case someone got access to our token, we changed the password/logged out.
//       if (currentUser.changedPasswordAfter(decoded.iat)) {
//         return next();
//       }

//       //There is a LOGGED In USER
//       res.locals.user = currentUser; //Our header pug template will know if user is present or not by here.
//       return next();
//     } catch (err) {
//       return next();
//     }
//   }
//   next();
// };

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

//Very Good Closures Example:, we are doing this coz we really wanna pass aruguments to the middlewear
//function which we cannot generally do. So we create a wrapper function which will then return our middlewear function with the desired args
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array: ['admin','lead-guide']. role='user' by default
    //This middlewear function now will have access to the above roles as this is in Closure now.
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permissions to perform this action', 403)
      );
    }
    next();
  };
};

//Below is soo Cool!!!
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('There is no user with that email address', 404));

  //2)Generate the random token
  const resetToken = user.createPasswordResetToken();
  //In Step2 of createPasswordResetToken, we modify the 'passwordResetToken' and 'passwordResetExpires' field in user's doc, below we are saving it to be persisted.
  await user.save({ validateBeforeSave: false });

  //3)Send it back as a email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!'
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  //Now we encrypt the token(which is in normal form), so we can compare it with the encrypted one in the DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken, //Converting simple token to encrypted one, then checking if it's same as passwordResetToken in DB
    passwordResetExpires: { $gt: Date.now() } //Checking if the passwordExpires time is in future, meaning if user still has time to change the pass or not.
  });
  //Only if above 2 conditions are satisfied, the user will be returned with a value

  //2)set new password only if token not expired, and there is user
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); //Now we won't turn off the validators as we wanna validate password now

  //3)update changedPasswordAt property for the user

  //4)Log the user in, send JWT
  createSendToke(user, 200, req, res);
});

//Allowing user to modify/update password without him needing to go though all of the forget/reset password process
//This only works if the user is already logged in
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2)Check if the POSTed current password is correct
  const passMatch = await user.correctPassword(
    req.body.passwordCurrent,
    user.password
  );
  if (!passMatch) {
    return next(new AppError('Your current password is wrong', 401));
  }
  //3)If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); //We need to validate, therefore we don't use User.findByIdAndUpdate

  //4) Log user in, send JWT
  createSendToke(user, 200, req, res);
});

//NOTE: when there's anything regarding users or passwords updating in the documents in DB, we always use .save() method
