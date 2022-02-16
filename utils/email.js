const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

//new Email(user,url).sendWelcome();

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Jonas Schmedtmann <${process.env.EMAIL_FROM}>`;
  }
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //SendGrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  //send the actual email
  async send(template, subject) {
    //1) render html based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    //2) Define the email options
    const mailOptions = {
      //from: this.from,
      to: this.to,
      from: process.env.SENDGRID_EMAIL_FROM,
      subject,
      html,
      text: htmlToText.fromString(html),
      //html
    };
    //3)create a transport and send emaiş

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'welcome to the Nodetours Family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token(valid for 10 min)'
    );
  }
};
/*
const sendEmail = async (options) => {
  
  var transporter = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: 'ec439f8d64f0b2',
      pass: '49ab5055b13f37',
    },
  });
};
*/
