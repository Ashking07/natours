const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('UNHANDLED Exception! 🧨 shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => {
    console.log('DB Connected Successfully!');
  });

app.get('/', (req, res) => {
  res.status(200).send('Hello From Other Side!');
});

//Below process of defining port as 'process.env.port' is absolutely mandotory for heroku to work as behind the scenes it
//randomly assigns a port to our application like this.
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//Catching all promise rejections globally e.g if DB password is wrong, so DB connection would fail
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 🧨 shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
