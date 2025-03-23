//Whenever we make any changes to this project, first we need to add, commit, and push any changes to our git repo,
// then from the Heroku dashboard, we manually deploy our repo again on 'https://dashboard.heroku.com/apps/natours-ashwin/deploy/github' (Deployment from heroku CLI didn't worked by me, therefore deployed manually by dashboard)

//To access heroku from CLI, run heroku login, then log in to your acc, then run heroku open to open our app

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
// eslint-disable-next-line import/no-extraneous-dependencies
const cookieParser = require('cookie-parser');
// eslint-disable-next-line import/no-extraneous-dependencies
const compression = require('compression');

const AppError = require('././utils/appError');
const globalErrorHandler = require('././controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

//Starts express app
const app = express();

app.enable('trust proxy');

//In express, pug templates are called views as in MVC -below we are setting up pug engine
app.set('view engine', 'pug'); //specifies the directory where the application will look for view templates, ensuring that the template engine knows where to find and render them.
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES

//Implement cors - to be able to give access to our api resourses for other api's/websites to consume
app.use(cors());
//Access-Control-Allow-Origin * (Allow all origins to access our api)(Only works for simple req, such as GET and POST)
// e.g if our api is on api.natours.com and front-end on natours.com, then by doing below we enable our front-end only to be able to access our api
// app.use(
//   cors({
//     origin: 'https://www.natours.com'
//   })
// );

//For non-simple req - allowing pre-flight phrase for any origin
app.options('*', cors());
//app.options('/api/v1/tours/:id',cors())

//Inbuilt MiddleWear to serve static files of our project
//By simply requesting the URL "http://127.0.0.1:3000/overview.html" in browser, we'll get served our overview.html static file
//Here we don't need to specify public because express will automatically search the public folder in server.
app.use(express.static(path.join(__dirname, 'public')));

app.get('/bundle.js.map', (req, res) => {
  res.redirect('/js/bundle.js.map');
});

//Setting http headers: Set Security HTTP headers
//https://helmetjs.github.io
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: [
//           "'self'",
//           'https://api.mapbox.com',
//           'https://cdnjs.cloudflare.com', // ✅ Added Cloudflare
//           'https://js.stripe.com/v3/',
//           "'unsafe-inline'",
//           "'blob'"
//         ],
//         styleSrc: [
//           "'self'",
//           "'unsafe-inline'",
//           'https://api.mapbox.com',
//           'https://fonts.googleapis.com'
//         ],
//         fontSrc: ["'self'", 'https://fonts.gstatic.com'],
//         imgSrc: [
//           "'self'",
//           'data:',
//           'https://api.mapbox.com',
//           'https://*.tiles.mapbox.com'
//         ],
//         connectSrc: [
//           "'self'",
//           'https://api.mapbox.com',
//           'https://*.tiles.mapbox.com',
//           'https://events.mapbox.com'
//         ],
//         workerSrc: ["'self'", 'blob:'],
//         objectSrc: ["'none'"],
//         frameAncestors: ["'self'"]
//       }
//     }
//   })
// );

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://cdnjs.cloudflare.com',
          'https://js.stripe.com/v3/',
          "'unsafe-inline'",
          "'blob'"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://api.mapbox.com',
          'https://fonts.googleapis.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'https://api.mapbox.com',
          'https://*.tiles.mapbox.com'
        ],
        connectSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://*.tiles.mapbox.com',
          'https://events.mapbox.com'
        ],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        frameSrc: [
          "'self'",
          'https://js.stripe.com' // Add this line to allow Stripe
        ],
        frameAncestors: ["'self'"]
      }
    }
  })
);

app.use(compression());

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: [
//           "'self'",
//           'https://api.mapbox.com',
//           'https://cdnjs.cloudflare.com',
//           'https://js.stripe.com/v3/',
//           "'unsafe-inline'",
//           "'blob'"
//         ],
//         styleSrc: [
//           "'self'",
//           "'unsafe-inline'",
//           'https://api.mapbox.com',
//           'https://fonts.googleapis.com'
//         ],
//         fontSrc: ["'self'", 'https://fonts.gstatic.com'],
//         imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
//         connectSrc: [
//           "'self'",
//           'https://api.mapbox.com',
//           'https://events.mapbox.com',
//           'https://js.stripe.com'
//         ],
//         frameSrc: [
//           "'self'",
//           'https://js.stripe.com' // ✅ Allows Stripe to load iframes
//         ],
//         objectSrc: ["'none'"],
//         upgradeInsecureRequests: []
//       }
//     }
//   })
// );

// // Set security HTTP headers
// app.use(helmet());

//DEVELOPMENT LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//LIMIT req FROM SAME IP: Doing this will help us prevent DOS attack and brute force attack.
//Here we specify how many req allowed from the same ip in an given time, eg allowing 100 req from same ip in 1 hr
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour!'
});
app.use('/api', limiter);

//We need to put this before parsing the body into json, because stripe needs it to be a stream(raw) and not json data
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

//Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb' //When req body larger than 10 kilo byte, don't accept it
  })
);
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
//to parse data coming from the form in updating user settings

app.use(cookieParser());

//Data Sanitization against NoSQL query injection. Sanitizes user request so no signs like $ are present which can be used for NoSQL query injection attacks
app.use(mongoSanitize());

//Data Sanitization againast Cross site scripting attack XXS. Cleans any malicious code coming from user
app.use(xss());

app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ] //Allowing duplicates for selected fields
  })
);

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next();
// });

//TEST Middlewear
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES: Mounting all the routers on these speified paths

//API Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//'.all' refers to all the http methods, get,post,etc
app.all('*', (req, res, next) => {
  // const err = new Error(`Cant't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  //doing this will skip all other middlewear and directly go to the error handling middlewear
  next(new AppError(`Cant't find ${req.originalUrl} on this server!`, 404));
});

//By specifying 4 parameters, express automatically identifies it's a error handling middlewear
//Next, you use app.use(globalErrorHandler); to register this middleware with your Express application.
//This ensures that the globalErrorHandler function is called for any uncaught errors that occur during request processing.
app.use(globalErrorHandler);
//The key point is that the globalErrorHandler acts as a safety net for any unhandled errors, ensuring that your
//application responds gracefully and provides informative error messages to the user.

module.exports = app;
