const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html, text }) => {
  // Check if SMTP configuration is set up
  const isSmtpConfigured = 
    process.env.SMTP_HOST && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS;

  if (!isSmtpConfigured) {
    console.log('\n========================================');
    console.log(`[DEVELOPMENT EMAIL SERVICE LOGGER]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Plain Text):`);
    console.log(text);
    console.log('========================================\n');
    return { mock: true, success: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Cricket Match Finder" <no-reply@cricketfinder.local>',
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return { mock: false, success: true, info };
  } catch (error) {
    console.error(`Nodemailer error: ${error.message}`);
    // Return mock success in development even on email failure to prevent blocking the user
    return { mock: false, success: false, error: error.message };
  }
};

module.exports = { sendEmail };
