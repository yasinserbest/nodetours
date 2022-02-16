const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const User = require('../models/userModel');

exports.getOverview = catchAsync(async (req, res) => {
  //1) get tour data from collection
  const tours = await Tour.find();

  //2) build template

  //3) render that template
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'reviews rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
    )
    .render('tour', {
      title: `${tour.name}`,
      tour,
    });
});
exports.getLoginForm = (req, res) => {
  res.status(200).render('login'), //buraası view klasöründeki login.pug
    {
      title: 'Log into your account',
    };
};

exports.getAccount = (req, res) => {
  res.status(200).render('account'),
    {
      title: 'your account',
    };
};
