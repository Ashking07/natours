const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true }); //We do this to get access to tourId parameter

//E.g POST /tour/3883822/reviews or POST /reviews , both would be redirected to review router, and thanks to mergeParams option, we get access to other routes parameters

router.use(authController.protect);

//Here for the below POST method, we have to explicitly provide the tourID in the req body.
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    // authController.protect,
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('admin', 'user'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('admin', 'user'),
    reviewController.updateReview
  );

module.exports = router;
