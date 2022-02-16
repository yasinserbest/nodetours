const crypto = require('crypto');
const validator = require('validator');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please provide a password'],
    validate: {
      //This only works on create and save
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not same!',
    },
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String, //bu ve alttakini forgotPassword için ekledi
  passwordResetExpires: Date,
});

//password client'tan geldiği zaman databese gitmeden önce middleware yazdık.
userSchema.pre('save', async function (next) {
  //only run this func. if password was actually modified
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12); //şifrelerken bekleme olmasın diye async yazıyoruz.

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  //kullanıcının yaratılış tarihi mi daha eski yoksa password değiştirdiği tarih mi eski onu bulmaya yardımıcı olan  fonksiyon. true dönerse kullanıcı password değiştirmiş, false deönerse değiştirmemiş
  if (this.passwordChangedAt) {
    //yok ise bu özellik demekki değiştirmemiş hiç pasaport
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(JWTTimestamp, changedTimestamp);
    return JWTTimestamp < changedTimestamp;
  }

  //false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10 dakikada expire oluyor.

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
