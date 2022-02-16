const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  //burası sadece image'ler yüklenecek filtrelemesi
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('Not an image! Please upluad only image file ', 400),
      false
    );
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter }); //bu da kullanım

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }, //bu nameler modeldekiler
]);
//şimdi farklı yerlere yükleneceği için tek seferde upload.fields dedim dedi
//eğer tek bir yere bir yükleseydim upload.single('image'),
//tek bir yere birden fazla yükleseydim upload.array('images',5 diyecektim dedi).

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  //1)imageCover
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`; //updateone handler func. hep req.body den aldığı için hep oraya yüklüyorum update ederken
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  //2)imeges
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
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  next();
};

exports.getAllTours = factory.getAll(Tour);
// //BUILD QUERY
// //1A) FILTERING
// const queryObj = { ...req.query }; //req.query'nin aynısını oluşturduk.
// const excludedFields = ['page', 'sort', 'limit', 'fields'];
// excludedFields.forEach((el) => delete queryObj[el]); //queryObj'de excludedFields var ise onları dışladık

// //1B) ADVANCED FILTERING
// let queryStr = JSON.stringify(queryObj);
// queryStr = JSON.parse(
//   queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`)
// );

// let query = Tour.find(queryStr);

// //2) SORTING
// if (req.query.sort) {
//   //req.query url'den gelenleri yazıyor hala aklında olsun unutmadın dimi?. ben urle ?sort=price dediğim için o sort'u query olarak aldı. orda sort yerine xx yazsaydım burda da xx yazıcaktım
//   const sortBy = req.query.sort.split(',').join(' '); //birden fazla sorgu gelirse url kısmında virgülle, onları vs de aralarında virgül değil space ile almam lazım o yüzden böyle yaptım.
//   //sort('price rating');
//   query = query.sort(sortBy);
// }

// //3) Field Limiting
// if (req.query.fields) {
//   const fields = req.query.fields.split(',').join(' ');
//   query = query.select(fields);
// } else {
//   query = query.select('-__v'); //mongoose'un otomatik olarak kullandığı bu __v kısmını - diyerek dışlamış oldum artık gelmeyecek karşıma.
// }

// //4)Pagination
// const page = req.query.page * 1 || 1; //page tanımlı değilse queryde falan default olarak 1 alıcak.
// const limit = req.query.limit * 1 || 100;
// const skip = (page - 1) * limit;

// query = query.skip(skip).limit(limit);

// if (req.query.page) {
//   //eğerki urlde page'i olduğundan fazla girerse client, mesela sen dökümanı 10 page olarak ayarladın ama client 17 ye ulaşmal istiyor. o zaman hata dönecek, bu hata da urlde page=17 yazdığı zaman döneceği için if(req.query.page) yazdı başka bişeyden değil.
//   const numTours = await Tour.countDocuments();
//   if (skip >= numTours) throw new Error('This page does not exist!');
// }
/*factoryden sonra kapattım
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  //EXECUTE QUERY
  const tours = await features.query;

  //SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});
*/
/* factoryden sonra kapatıım 
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate('reviews'); //burdaki params tourRoutes'tan gelirken tanımladığın paramlardan id olanı. ordaki ismi neyse aynen öyle yazıyosun buraya. sadece id tanımladın başka şeyler tanımlasaydın gene onları yazıcaktın x y z yazsan da olur.

  if (!tour) {
    return next(new AppError('No tour find with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});
*/
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
//actory den sonra kapattım
exports.createTour = factory.createOne(Tour);

/* factory den sonra kapattım
exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, { //ilk parametre neyi update ediceğim, ikincisi ne ile update edeceğim, üçüncüsü ise uprdate ederken optionslar.
    //postman body kısmından değer gidiyorum
    new: true, 
    runValidators: true, //mesela tourModel'de validatlerin var. name 10 karakterden az name olamaz diye, bunu false yaparsak veya girmezsen, 10 karakterden fazla bir name'i 4 karakter olarak update yaptığında kabul eder. ama kabul etmesin istiyorum, o yüzden true.
  });

  if (!tour) {
    return next(new AppError('No tour find with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});
*/
exports.updateTour = factory.updateOne(Tour);

/* factory den sonra kapattım 
exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('No tour find with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});
*/
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      //bu bir stage ve bu bir match stage. istediğin kadar böyle stage tanımlayabilirsin peşpeşe
      $match: { ratingsAverage: { $gte: 4.5 } }, //bu bana rAverage 4.5'ten büyük olanları getirecek
    },
    {
      //şimdi bir group stage tanımlayacağım
      $group: {
        //şimdi burda fieldler tanımlayacağım
        _id: '$difficulty', //burda null yazıp difficulty’e göre gruplandırmak zorunda değilsin, id ye hangi field’i yazarsan ona göre gruplandırır null’i ‘ ‘ olmadan yazıcaksın ‘null’ değil null
        num: { $sum: 1 }, //sağdakine eşit olan değerleri alıyor, $olan işlemi yapıp : solundaki yazdığına atıyor anladığım kadarıyla. burda mesela hepsine 1 koydu sum dedin toplamını sola atıyor.
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' }, // : solundaki benim çıktıda görmek isteğim şekli, sağındaki ise mongo docstan ulaşabilirsin stage herhanle onlarda bilmiyorum ne, en sondaki "" içindekiler ise benim schemamda olan isimler
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', //bir turda birden fazla startDate var, ben her startDate için farklı bir nesne oluşturdum. mesela 3 startdate var ise o 3'ü için ayrı ayrı nesne oluştu
    },
    {
      $match: {
        startDates: {
          //sadece aynı yearda olanları aldık
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }, //array şeklinde isimlerini yazdım
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0, //id gözükmesin dedi
      },
    },
    {
      $sort: { numTourStarts: -1 }, //çoktan aza sıralama, azdan çoka için 1
    },
    {
      $limit: 25, //burda lazım değil ama göstermek isityorum dei
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; //geowithin filtresi için yarıçapp lazım. dünyanın yarıçağını da böyle alıyorsun bu parametrelerde
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, //genelde find içine filtreleme yapıyo options falan yazıyo. geospital filtrelerine fonksiyonlarına dokumantasyondan ulaşabilirsin kullanım şekline
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
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
    //calculatinoslar için aggregetions pipelines kullanıyoruz dedi
    {
      $geoNear: {
        //iki parametre giricen, biri point'in, yanı nereden uzaklık almak istiyorsun, diğeri de outputun
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        //sadece aşağıdakileri aldık tüm tur datasını getiriyodu karman çorman.
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
