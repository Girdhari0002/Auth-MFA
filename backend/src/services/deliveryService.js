const nodemailer = require("nodemailer");
const twilio = require("twilio");
const {
  nodeEnv, smtpHost, smtpPort, smtpUser, smtpPassword, mailFrom,
  twilioAccountSid, twilioAuthToken, twilioPhoneNumber,
} = require("../config/env");

const mailTransport = smtpHost && smtpUser && smtpPassword
  ? nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPassword } })
  : null;
const smsClient = twilioAccountSid && twilioAuthToken ? twilio(twilioAccountSid, twilioAuthToken) : null;

function missing(channel) {
  const error = new Error(`${channel} delivery is not configured. Set the delivery variables in backend/.env.`);
  error.status = 503;
  return error;
}

async function sendEmailOtp(to, otp) {
  if (!mailTransport || !mailFrom) {
    if (nodeEnv !== "production") return console.log(`[DEV EMAIL OTP] To: ${to} OTP: ${otp}`);
    throw missing("Email");
  }
  await mailTransport.sendMail({
    from: mailFrom,
    to,
    subject: "Your SecureID verification code",
    text: `Your SecureID verification code is ${otp}. It expires in 3 minutes.`,
  });
}

async function sendSmsOtp(to, otp) {
  if (!smsClient || !twilioPhoneNumber) {
    if (nodeEnv !== "production") return console.log(`[DEV SMS OTP] To: ${to} OTP: ${otp}`);
    throw missing("SMS");
  }
  await smsClient.messages.create({
    body: `SecureID verification code: ${otp}. It expires in 3 minutes.`,
    from: twilioPhoneNumber,
    to,
  });
}

module.exports = { sendEmailOtp, sendSmsOtp };
