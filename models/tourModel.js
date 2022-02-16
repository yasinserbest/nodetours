const mongoose = require('mongoose');
const slugify = require('slugify');
//const User = require('./userModel');
//const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    //yeni bir scheama oluşturduk. modelde olacak olan özellikleri belirttik
    name: {
      type: String,
      required: [true, 'A tour must have a name'], //ilk özelliği giriyorum ikincisi error olunca ne olucak
      unique: true, //aynı isimli 2 tane oluştuamazsın
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40'],
      minlength: [10, 'A tour name must have less or equal then 10'],
      //validate: [validator.isAlpha, 'Tour name must  only contain characters '],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maxGroupSize'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulity'],
      enum: {
        //sadece string'te çalışır, valuesler haricinde herhangi bir şey kabul etmez.
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy medium difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5, //verilmeze bu yazacak
      min: [1, 'Rating must be above 0 '], //hem number hem de dates'te çalışır
      max: [5, 'Rating must be below 5 '],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price; //burdaki this sadece yeni documentler için geçerli, update yapacaksan geçerli değil
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a imageCover'],
    },
    images: [String], //string bişekilde array tutmak istiyorum
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //geoJson
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      adress: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        adress: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  }, //normalde hemen ) kapanıyor fakat vituallar için { } açtım
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 }); //ascending olarak sıraladık
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return (this.duration / 7).toFixed(1);
});

//virtual populate
tourSchema.virtual('reviews', {
  //burası getirdiğin zaman fieldde yazacak olan kısım
  ref: 'Review', //buraya getirmek istediğin yerin bulunduğu modeli girdin
  foreignField: 'tour', //bu getirmek istediğin modelin içindeki getirmek istediğin field -key-
  localField: '_id', //bulunduğum modelde eşlemek istediğim field
});

/*****DOC MİDDLEWARESSS */

tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
/*
tourSchema.post('save', function (doc, next) {
  //pre fonskyonlar çalıştıktan sonra postlar çalışacak. birden fazla pre ve post tanımlayabilirsin
  console.log(doc);
  next();
});
*/
/* embedding kodu embed ile yapmayacağım update zor referencing yapacağım dedi
tourSchema.pre('save', async function (next) { //bu fonksiyonu anllamadım.
  const guidesPromises = this.guides.map(async (id) => await User.findById(id)); //burda sağdaki await promise döndüreceğinden alta await ile promise.all ekleyeceğiz üstüne de async yazacağız falan dedi
  this.guides = await Promise.all(guidesPromises);
  next();
});
*/
/*****QUERY MİDDLEWARESSS */
//bu ise bir query başlamadan veya başladıktan sonra run olur.
tourSchema.pre(/^find/, function (next) {
  //schemamda olan herhangi bir find metodu çalışmadan çalışcak
  this.find({ secretTour: { $ne: true } }); //controllerimdeki find metodu bütün tourları getirmeden ben burda pre query middleware kullanıdm ve secretTour olanları gizledim, false olanları getirecek sadece bu sayede.
  next();
});
//üstteki find yazan get metodunu /tours'ta kulllanırsan secret olan gelmez çalışır bu middleware fakat sen /tour/id olarak yazarsan get tour http requesti için o zaman secret:true olsa bile bunu getirir. bunun sebebi find ile çalırken orda findOne yapıyosun , ya bu middleware'i findOne için tekrar yazıcaksan yada reqular expression yazıcaksın şöyle: /^find/ .Şimdi tüm find için çalışır findOne, findAndDelete,findOneAndUpdate vs...

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

/*****AGGREGATION MİDDLEWARESSS */
/* geoNear için kapattık
tourSchema.pre('aggregate', function (next) {
  //aqqregetion'un amacı mesela sen difficulty'e göre sıralama yaptın, orda hala secret:true olanlar geliyor, onu engellemek için bunu yazman gerek ki orda da gelmesin. veya burda middliwere kullanmazsan teker teker middlewarelere yazzman gerekir.
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  //console.log(this.pipeline());
  next();
});
*/
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
