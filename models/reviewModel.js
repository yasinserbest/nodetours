const mongoose = require('mongoose');
const Tour = require('./tourModel');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not bt empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      //bunlar parent reference oldu işte
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },

    user: {
      //bunlar parent reference oldu işte
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   //iki middleware yazacağın zaman bu şekilde birşeştiriyorsun
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    //tour populate'ini kaldırdı, getTour dediğinde chain populates oluyordu. idsi gelsin turun tüm tour gelmesin dedi, 156
    //iki middleware yazacağın zaman bu şekilde birşeştiriyorsun
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    //önce review post oldukça değerleri aldı stats'ın çine
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', //neye göre gruplandırmak istediğim
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      //sosnra Tour'da kodu güncelleyen kısım
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};
reviewSchema.post('save', function () {
  //her post yaptığımda çağırdım
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
