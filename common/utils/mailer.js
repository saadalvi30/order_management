const nodemailer = require("nodemailer");
const logger = require("../logger");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendWelcomeEmail({ to, name, email, password, role }) {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject: "Welcome! Your account has been created",
      html: `
        <h2>Hi ${name},</h2>
        <p>Your account has been created successfully. Here are your login details:</p>
        <ul>
          <li><b>Email:</b> ${email}</li>
          <li><b>Password:</b> ${password}</li>
          <li><b>Role:</b> ${role}</li>
        </ul>
        <p>Please log in and change your password as soon as possible.</p>
      `,
    });
    logger.info("Welcome email sent", { to });
  } catch (error) {
    logger.error("Failed to send welcome email", { to, error: error.message });
  }
}
async function sendInviteEmail({ to, name, role, token }) {
  try {
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject: "You're invited to join as " + role,
      html: `
        <h2>Hi ${name},</h2>
        <p>You've been invited to join as a <b>${role}</b>.</p>
        <p>Click the link below to set your password and activate your account:</p>
        <a href="${inviteLink}">${inviteLink}</a>
        <p>This link will expire in 48 hours.</p>
      `,
    });
    logger.info("Invite email sent", { to });
  } catch (error) {
    logger.error("Failed to send invite email", { to, error: error.message });
  }
}

module.exports = { sendWelcomeEmail, sendInviteEmail };