// const catchAsync = require('../utils/catchAsync');
const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  //ALLOW NESTED ROUTES
  if (!req.body.tour) req.body.tour = req.params.tourId; //Either we provide this in the req body for when using the root route '/' or it is dynamically taken from params.
  if (!req.body.user) req.body.user = req.user.id; //WE Get this from the PROTECT MIDDLEWEAR
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
