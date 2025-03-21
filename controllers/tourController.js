// eslint-disable-next-line import/no-extraneous-dependencies
const multer = require('multer');
// eslint-disable-next-line import/no-extraneous-dependencies
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
//Below is not working, check and debug later
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') req.file
// upload.array('images', 5) req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  //Pre-filling the query string for the user to show them top 5 best and cheapest tours, assuming this route is frequently visited.
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

//queryString is the same as req.query
// class APIFeatures {
//   constructor(query, queryString) {
//     this.query = query;
//     this.queryString = queryString;
//   }

//   filter() {
//     //1A.Filtering
//     const queryObj = { ...this.queryString };
//     const excludedFields = ['page', 'sort', 'limit', 'fields'];
//     excludedFields.forEach(el => delete queryObj[el]);

//     //1B.Advance Filtering
//     let queryStr = JSON.stringify(queryObj);
//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

//     this.query = this.query.find(JSON.parse(queryStr));

//     return this;
//     //we return these so that we have access to the result of this method so that we can chain other methods on it
//   }

//   sort() {
//     // Check if sort exists
//     if (this.queryString.sort) {
//       console.log('Sort Query:', this.queryString.sort); // Debugging
//       const sortBy = this.queryString.sort.split(',').join(' ');
//       this.query = this.query.sort(sortBy);
//     } else {
//       this.query = this.query.sort('-createdAt'); // Default sorting
//     }

//     return this; // Allows chaining
//   }

//   limitFields() {
//     if (this.queryString.fields) {
//       const fields = this.query.fields.split(',').join(' ');
//       //The Above line would convert the fields field here "127.0.0.1:3000/api/v1/tours?fields=name,duration,ratings" to "fields=name duration ratings" which is the format required by mongoDB to filter data using fields.
//       this.query = this.query.select(fields);
//     } else {
//       //In case user dosen't specify the fields field
//       this.query = this.query.select('-__v');
//       //Here we are excluding the "__v", by negating it with minus sign
//     }

//     return this;
//   }

//   paginate() {
//     //4.Pagination
//     const page = this.queryString.page * 1 || 1;
//     const limit = this.queryString.limit * 1 || 100;
//     //Above, we are setting the default values for pagination, i.e If we have a million docs in DB, user would just be shown 100 docs per page
//     const skip = (page - 1) * limit;

//     //page=3&limit=10, 1-10 page 1, 11-20 page 2, 21-30 page 3
//     // query = query.skip(20).limit(10);
//     this.query = this.query.skip(skip).limit(limit);

//     return this;
//   }
// }

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   //BUILD QUERY
//   // //1A.Filtering
//   // const queryObj = { ...req.query };
//   // const excludedFields = ['page', 'sort', 'limit', 'fields'];
//   // excludedFields.forEach(el => delete queryObj[el]);

//   // //1B.Advance Filtering
//   // let queryStr = JSON.stringify(queryObj);
//   // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

//   //{difficulty:'easy',duration:{$gte:5}} - The basic format to filter in our query in mongoDB
//   // console.log(
//   //   'Example of formatted queryStr after using regular expressions - ',
//   //   queryStr
//   // );
//   //The getAllTours function dynamically constructs MongoDB queries using Mongoose
//   //based on query parameters received from req.query. Fields like page, sort, limit, and fields are
//   //excluded because they are used for pagination, sorting, or field selection rather than filtering the database.

//   //Here, the Tour.find() method will return a query, so we store it seperately to keep chaining more methods on it like below in sorting
//   // let query = Tour.find(JSON.parse(queryStr));

//   //2.SORTING
//   // if (req.query.sort) {
//   //   const sortBy = req.query.sort.split(',').join(' ');
//   //   query = query.sort(sortBy);
//   //   //sort('price ratingsAverage')
//   // } else {
//   //   query = query.sort('-createdAt');
//   // }

//   //3.Field Limiting
//   // if (req.query.fields) {
//   //   const fields = req.query.fields.split(',').join(' ');
//   //   //The Above line would convert the fields field here "127.0.0.1:3000/api/v1/tours?fields=name,duration,ratings" to "fields=name duration ratings" which is the format required by mongoDB to filter data using fields.
//   //   query = query.select(fields);
//   // } else {
//   //   //In case user dosen't specify the fields field
//   //   query = query.select('-__v');
//   //   //Here we are excluding the "__v", by negating it with minus sign
//   // }

//   // //4.Pagination
//   // const page = req.query.page * 1 || 1;
//   // const limit = req.query.limit * 1 || 100;
//   // //Above, we are setting the default values for pagination, i.e If we have a million docs in DB, user would just be shown 100 docs per page
//   // const skip = (page - 1) * limit;

//   // //page=3&limit=10, 1-10 page 1, 11-20 page 2, 21-30 page 3
//   // // query = query.skip(20).limit(10);
//   // query = query.skip(skip).limit(limit);

//   // if (req.query.page) {
//   //   const numTours = await Tour.countDocuments();
//   //   if (skip >= numTours) throw new Error("This Page Dosen't Exist");
//   // }

//   //WAYS OF WRITING QUERIES
//   // let query = Tour.find(JSON.parse(queryStr));

//   // const query = await Tour.find({
//   //   duration:5,
//   //   difficulty:'easy'
//   // });

//   // const query = await Tour.find()
//   //   .where('duration')
//   //   .equals(5)
//   //   .where('difficulty')
//   //   .equals('easy');

//   //EXECUTING QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   //The Above chain constructs a single query object as:
//   //  const query = Tour.find({ price: { $gte: 500 } })
//   // .sort('price -ratingsAverage')
//   // .select('name duration price')
//   // .skip(5)
//   // .limit(5);
//   //Then we run this query object by extracting it from APIfeatures class using the features instance created above
//   //After that we await it, it's like saying go fetch the result of this query and store it in tours.

//   //SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours
//     }
//   });
// });

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// Mongoose Logic: (See virtuals field 'reviews' in the tourModel file)
// When you query a Tour document and populate the reviews field, Mongoose:
// Takes the _id of the current Tour document (from localField).
// Searches the Review collection for documents where the tour field (defined as foreignField) matches this _id.
// Retrieves all matching Review documents and includes them in the reviews virtual field.

exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      // Filter tours with a ratingsAverage >= 4.5
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      // Group by difficulty (convert to uppercase), calculate various statistics
      $group: {
        _id: { $toUpper: '$difficulty' }, // Group by difficulty in uppercase
        num: { $sum: 1 }, // Total number of tours in this group
        numRatings: { $sum: '$ratingsQuantity' }, // Total number of ratings
        avgRating: { $avg: '$ratingsAverage' }, // Average rating
        avgPrice: { $avg: '$price' }, // Average price
        minPrice: { $min: '$price' }, // Minimum price
        maxPrice: { $max: '$price' } // Maximum price
      }
    },
    {
      // Sort by avgPrice in ascending order
      $sort: { avgPrice: 1 }
    }
  ]);

  // Send the response
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

//Solving a real business plan, analysing which month is the busiest!
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
      //Deconstruct an array field from the input docs then output 1 doc for each el of the array
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      length: plan.length,
      plan
    }
  });
});

//Searching for tour documents within a certain distance from a certain point using GeoSpatial queries
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; //Converting radius to radians

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  console.log(distance, lat, lng, unit);
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      //Always need to be the first stage here below in this case
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1] // Ensure lng and lat are numeric
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
