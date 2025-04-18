// routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Otp from '../models/Otp.js'
import bcrypt from 'bcrypt';

dotenv.config();
const router = express.Router();

// @route   POST /api/register
// @desc    Register new user after OTP verification
router.post('/register', async (req, res) => {
  const { name, email, password, otp } = req.body;

  try {

    // Check if all required fields are provided
    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: 'All fields are mandatory' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Retrieve the most recent OTP for the email
    const existingOtp = await Otp.findOne({ email });

    // Validate OTP
    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Optionally, delete the used OTP
    await Otp.deleteMany({ email });

    res.status(201).json({ user: { email: user.email, id: user._id, name: user.name } });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {

    // Check if all required fields are provided
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are mandatory' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Match the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Respond with the token and user details
    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        id: user._id,
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/sendotp
// @desc    Send OTP to user
router.post('/sendotp', async (req, res) => {
  const { email } = req.body;

  try {

    // Generate a 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if all required fields are provided
    if (!email) {
      return res.status(400).json({ message: 'All fields are mandatory' });
    }

    // Check if an unexpired OTP already exists for the email
    const existingOtp = await Otp.findOne({ email });

    if (existingOtp) {
      return res.status(400).json({ message: 'OTP already sent' });
    }

    const newOtp = new Otp({ email, otp });
    await newOtp.save(); // This will trigger the pre-save hook to send the email
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// @route   POST /api/verify-session
// @desc    Verify the JWT token and return user info if valid
router.post('/verify-session', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    console.log(`token: ${token}`)
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    // Verify the token using the secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log(`decoded: ${JSON.stringify(decoded)}`)

    // Respond with the user details if the token is valid
    res.json({
      message: 'Session verified successfully',
      user: {
        email: decoded.email,
        name: decoded.name,
      },
    });
  } catch (err) {
    console.error('Error during session verification:', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find matching OTP
    const existingOtp = await Otp.findOne({ email });
    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    const user = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete used OTP
    await Otp.deleteMany({ email });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;