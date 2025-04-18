import mongoose from 'mongoose';
import sendEmail from '../utils/sendEmail.js';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // OTP expires after 5 minutes
});

otpSchema.pre('save', async function () {
  const subject = 'Your OTP Code';
  const text = `Your OTP is: ${this.otp}`;
  await sendEmail(this.email, subject, text);
});

export default mongoose.model('Otp', otpSchema);
