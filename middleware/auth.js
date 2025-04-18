// middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const protect = (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req._id = decoded.id;
    req.name = decoded.name;
    req.email = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token failed' });
  }
};

export default protect;