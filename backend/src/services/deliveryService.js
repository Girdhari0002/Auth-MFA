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
const senderAddress = mailFrom || smtpUser;

function missing(channel) {
  const error = new Error(`${channel} delivery is not configured. Set the delivery variables in backend/.env.`);
  error.status = 503;
  return error;
}

async function sendEmailOtp(to, otp) {
  if (!mailTransport || !senderAddress) {
    if (nodeEnv !== "production") return console.log(`[DEV EMAIL OTP] To: ${to} OTP: ${otp}`);
    throw missing("Email");
  }
  try {
    const result = await mailTransport.sendMail({
      from: senderAddress,
      replyTo: smtpUser,
      to,
      subject: "SecureID verification code",
      text: `Your SecureID verification code is ${otp}.\n\nThis code expires in 3 minutes. If you did not request this code, you can ignore this email.`,
      html: `<p>Your SecureID verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in 3 minutes. If you did not request this code, you can ignore this email.</p>`,
      headers: {
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
      },
    });

    if (!result.accepted?.length) {
      const error = new Error("Email provider did not accept the OTP message.");
      error.status = 502;
      throw error;
    }

    console.log(`Email OTP accepted for ${to} (messageId: ${result.messageId})`);
  } catch (error) {
    console.error("Email OTP delivery failed:", {
      code: error.code,
      responseCode: error.responseCode,
      message: error.message,
    });
    if (!error.status) error.status = 502;
    throw error;
  }
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
