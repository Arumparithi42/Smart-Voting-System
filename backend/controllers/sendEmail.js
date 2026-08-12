import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendBookingConfirmationEmail = async (email, bookingDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Booking Confirmation',
    html: `
      <h1>Your Booking is Confirmed!</h1>
      <p>Thank you for your booking. Here are your booking details:</p>
      <ul>
        <li><strong>Booking Date:</strong> ${new Date(bookingDetails.bookingDate).toLocaleDateString()}</li>
        <li><strong>Delivery Date:</strong> ${new Date(bookingDetails.deliveryDate).toLocaleDateString()}</li>
        <li><strong>Total Amount:</strong> $${bookingDetails.amount}</li>
        <li><strong>Cylinder Brand:</strong> ${bookingDetails.cylinder.brand}</li>
        <li><strong>Cylinder Size:</strong> ${bookingDetails.cylinder.size} kg</li>
        <li><strong>Status:</strong> ${bookingDetails.status}</li>
      </ul>
      <p>We look forward to serving you!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }
};
