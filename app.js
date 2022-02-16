const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) -------MIDDLEWARES--------
// Serving static files
//app.use(express.static(`${__dirname}/public`)); //public klasörünü middleware olarak  tanıttım. artık public altındaki dosyalara url kısmından eişebilirim.. değiştirdim. alta yazdım öyle kullandedi

app.use(express.static(path.join(__dirname, 'public')));

app.use(helmet()); //helmet package indirdiki her express projesinde olması lazım dedi güvenlik açısından. Böyle yazıp bırakman yeterli. headerslar ve kısıtlamalar ekliyor

//console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 1 * 60 * 60 * 1000, //1 saat
  message: 'too many requests from this IP, please try again later!',
});

app.use('/api', limiter); //api ile başlayatn tüm routelara uyguladı bunu.
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(express.json()); //middleware clienttan servera gelen datayı modify etmek için post kısmında kullandık. şuan data ne clientta(requestte) ne de serverda(respondda) yani middleware oluyor. bizde o datayı modify etmek istiyoruz.

//data sanitization aaginst NoSql query injection
app.use(mongoSanitize());
//data sanitization against xss

//app.use(express.static(`${__dirname}/public`)); //public klasörünü middleware olarak  tanıttım. artık public altındaki dosyalara url kısmından eişebilirim.. değiştirdim. alta yazdım öyle kullandedi
app.use(xss());
// app.use((req, res, next) => {
//   //middleware 3 param. alır istersen x,y,z yaz farketmez ama bu şekilde kullanım kabul görmüş.
//   // console.log('hello from the middlwate👋🏻');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
//app.use('/api/v1/booking', bookingRouter);

app.all('*', (req, res, next) => {
  //gördüğün gibi en alta yazıyorsun bunu. buraya kadar gelmişse demekki zamn üstte öyle bir route bulamamıştır ve buraya sekmiştir.
  // res.status(404).json({
  //   status: 'fail',
  //   message: `cant find ${req.originalUrl} on this server!`,
  // });

  // const err = new Error(`cant find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  //next(err); //next'in içine sadece error için parametre eklyorsun. eklediğin zaman error middleware'e gitmesi gerektiğini anlıyor.

  next(new AppError(`cant find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
