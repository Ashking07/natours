const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

//whenever there is a route with id as parameter in the URL, check if that id is valid or not 👇
// router.param('id', tourController.checkID);

//CREATING REVIEWS IN NESTED ROUTES
//POST  /tour/83822838/reviews - a nested route
//GET /tour/83822838/reviews - a nested route
//GET /tour/83822838/reviews/372881929 - a nested route

//Review route is within the tour route
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

router.use('/:tourId/reviews', reviewRouter); //Here we are saying, for this specific route, use reviewRouter.
//router is just an middlewear, so we can use the keyword 'use' on it too

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours); //Here, first the aliasTopTours middlewear will run then getAllTours middlewear

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

//Geo spatial query route
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within/233/center/-40,45/unit/miles

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
