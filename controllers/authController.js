const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, //normalde bunun hemen altında secure: true yazmıştı ama o https olunca kullanılır dedi. şimdi kullanırsam hata verir. o yüzden productionda olunca eklensin diye if yazdım alta
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions); //cookie böyle oluşturulur

  //remove password from the output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if email and password are exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password ', 400));
  }

  ///2) check if user exist and password is correct
  const user = await User.findOne({ email }).select('+password'); //password'u userModelda select:false yaptım gelmiyor, burda gelmesi lazım bu şek,lde ekledim

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3)if ever. ok, send token
  createSendToken(user, 200, res);

  const token = signToken(user._id);
});
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    // createsendtoken res.cookie'de jwt dedğimiz için burda da jwt diyoruz
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }
  //2) verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3)check if user still exist. User üyeliğini silmiş olabilir ama token hala geçerlidir. öyle olduğu zaman tokenide deaktif yapmak lazım
  const currentUser = await User.findById(decoded.id); //decoded'te id geliyor ise demekki o user var ve true döner
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does no longer exist', 401)
    );
  }

  //4) checkk if user changed password after the token was created

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please log in again', 401)
    );
  }
  //GRANT ACCCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser; //account pug'ına attı userı

  next();
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser; //res.locals ile puglar içinde veri atabiliyorum. user diye tanımladığım bir değişken oluştuurp onların içine attım. mesela tour.pugda kullanım en altta buttonda ${tour} diye
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  //Birden fazla param. olduğu için rest ile açtım
  return (req, res, next) => {
    // middleware func. parametre giremiyosun, o yüzden böyle yaptım üstte normal fonk. altında return ile middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You dont have permission to perform this action', 403)
      );
    }
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get user based on email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with email adress.', 404));
  }

  //2) Generate the random reset token . Bu bizim kullanıcıya göndereceğimiz resetleme token'i olacak. Her kulllanıcının kendi resetleme tokenini neden başta yaratıp database'e koymuyoruz? çünkü saldırı gelirse tokenler çalınır ve passwordları hackerlar resetler. bu tokenide şifreleyeceğiz şifresini tutacağız database'de kullanıcıya şifresiz token'i göndereceğiz, o bize post ile tekrar bunu gönderdiğinde database'de olan şifreliyle karşılaştıracağız ikisi uyuşuyor mu diye.
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //burda false demezsen update yapıyormuşsun gibi algılıyor ve modeldeki validate kısımlarını senden istiyor.

  //3)send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = 'undefined';
    user.passwordResetExpires = 'undefined';
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user base on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  ///2)if token has not expired,and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); //save kullandım update değil. içine de yukardakiler gibi validate false demedim. çünkü tüm validasyonlarımın asağlanmasını istiyorum.
  //3)update changedPasswordAt property for the user

  //4)log the user in, send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from collection
  const user = await User.findById(req.user.id).select('+password'); //req.user'i protected'den atamıştık yukarda

  //2)check if posted current password
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    //correctPassword ise userModel'da tanımlı
    return next(new AppError('Your current password is wrong!', 401));
  }
  //3)if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); //burda da update kullamadık farkındaysan çünkü validatelar geçerli olsun istiyoruz
  const token = signToken(user._id);

  //4) lo user in, send jwt
  createSendToken(user, 200, res);
});
