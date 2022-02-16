const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('Uncaught EXCEPTION! 💥 Shutting Down...');
  console.log(err.name, err.message);

  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');
//console.log(process.env);

//DATABASE
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    //console.log(con.connections);
    console.log('DB connections successfully !!');
  })
  .catch((err) => {
    console.log(err);
  });

//SERVER

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`app running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
