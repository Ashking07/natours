const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel'); // For when embedding e.g guides in tour
// const validator = require('validator');

//A Basic Data Schema(Basic Description of our data and validation)
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A Tour Must Have A Name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 ch'],
      minlength: [10, 'A tour name must have more or equal than 10 ch']
      //Can use external library for validation
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A Tour Must Have A Duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A Tour Must Have A Group Size']
    },
    difficulty: {
      type: String,
      required: [true, 'A Tour must have difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is ether: easy, medium, difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating Must Be greater than 1.0'],
      max: [5, 'Rating Must Be less than 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A Tour Must Have A Price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          //'this' only points to curr doc on NEW document creation, so it won't work on update method
          return val < this.price;
        },
        message: 'Discount Price ({VALUE}) should be below regular price'
      }
    },
    summary: {
      type: String,
      required: [true, 'A tour must have a description'],
      trim: true //removes all the white spaces from start and end
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String], //defined an array of Strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false //Doing this will hide this field from showing to users.
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      //GeoJSON to specify geo-spatial data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    //Creating embedded documents/datasets - these gets their own object ID, you can check DB.
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    // guides: Array //Used for when embedding
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }] //Here, the IDs of guides would be inserted in the guides array, and we are saying to look at User dataset to reference these IDs
  },
  {
    //Here we are specifying that each time the data is outputted as JSON/Object, we want the virtuals to be part of output
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
    //But Note that we can't query on virtuals in a query as they aren't part of the DB.
  }
);
//Any data which would be tried to create/delete/updated/read, other than this above defined, would be ignored!

//Creating custom indexes - by-default: mongoDB creates indexes for frequent queries, like id's emails
//Indexes: makes read performance on our docs much better.
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 }); //Compund index
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//This virtual property woun't be persisted in the DB, coz they can be basically derived using the existing data in Schema
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
  //'this', here this keyword would be pointing to the current document, there we need it here hence we use the regular function
});

//VIRTUAL POPULATE *imp*
// This virtual field doesn’t store data in the database. Instead, it creates a logical link between Tour and Review documents.
// Mongoose uses this to fetch related data dynamically during queries, without actually embedding or storing reviews within the Tour documents in MongoDB.
//By this we are populating the tours with reviews without having to do child reference them.This way we give our tours access to reviews
//We are bascically saying, what locally (In our tour model) is _id, is called 'tour' in our reviewSchema which is a foreginField. This is how we conect both
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', //This is the name of the other model (Here, review model), where ref to curr model is stored.
  localField: '_id'
});
//1)First it tells to start looking at the Review model which is made out of reviewSchema.
//2) Then Here we are basically saying that, the field '_id' in reviews field here in tourModel made out of tourSchema is called 'tour' in the reviewModel,
//3)i.e the tour ids are stored as tour in the reviews. So this tells mongoose to search for all the _id's in reviews and get them.

//DOCUMENT MIDDLEWEAR: runs before the .save() and .create()
//Here, the "this" keyword points to the currently processing docs
//'this' only points to curr doc on NEW document creation, so it won't work on update method
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// //Below we are fetching the guides from users collection and embedding them as array in the tours documents.
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//Below is example of more Doc Middlewears
// tourSchema.pre('save', function(next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   console.log('Document Save To DB: ', doc);
//   next();
// });

//QUERY MIDDLEWEAR
//Here, the 'this' keyword will point towards the currently processing query
tourSchema.pre(/^find/, function(next) {
  // tourSchema.pre('find', function(next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  }); //Now guides aren't embedded in tours but they are referenced, so they aren't stored in DB under tours, populate will only populate guides document when queryed a tour.

  next();
});

tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${(Date.now() - this.start) / 1000} seconds!`);
  // console.log(docs);
  next();
});

//Commented below midlewear as geo spatial middlewear needs to be the first one in the stack to be working
// // AGGREGATION MIDDLEWEAR
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   console.log(this.pipeline());
//   next();
// });
//I've added below from chatGPT instead of above
tourSchema.pre('aggregate', function(next) {
  // Check if $geoNear is the first stage
  if (this.pipeline().length > 0 && this.pipeline()[0].$geoNear) {
    return next(); // Skip adding $match for $geoNear queries
  }

  // Add $match stage for other aggregation pipelines
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

  console.log(this.pipeline());
  next();
});

//A Simple Model which uses our above Schema(which acts as a blueprint)
const Tour = mongoose.model('Tour', tourSchema);
//We will use this Tour object to interact with out DB collection, if no collection then mongoDB would create a new
//Collection with the plural name of this ("tours")

module.exports = Tour;

//4 types of middlewears in Mongoose
//Document,query,aggregate,model;
