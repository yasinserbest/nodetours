const Review = require('./../models/reviewModel');
//const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

/* factoryden sonra kapattım
exports.getAllReviews = catchAsync(async (req, res, next) => {
 
  const reviews = await Review.find(filter);

  //SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});
*/
exports.getAllReviews = factory.getAll(Review);
exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id; //protect'ten aldık dedi
  next();
};

/* factory den sonra kapattım
exports.createReview = catchAsync(async (req, res, next) => {
  const newReview = await Review.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      review: newReview,
    },
  });
});
*/

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
