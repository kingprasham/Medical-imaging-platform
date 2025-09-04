const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();

console.log('🔐 Auth routes loaded');

// Simple users data
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    email: 'admin@hospital.com',
    role: 'admin',
    firstName: 'System',
    lastName: 'Administrator'
  },
  {
    id: 2,
    username: 'doctor',
    password: 'doctor123',
    email: 'doctor@hospital.com',
    role: 'doctor',
    firstName: 'Dr. John',
    lastName: 'Smith'
  }
];

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes are working!',
    availableUsers: users.map(u => ({ username: u.username, role: u.role }))
  });
});

// Login endpoint
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters')
], (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    console.log(`Login attempt: ${username}`);

    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password (simple comparison for now)
    if (user.password !== password) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'medical_imaging_secret_key_2024',
      { expiresIn: '24h' }
    );

    // Return success response (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    console.log(`Login successful for user: ${username}`);
    res.json({
      user: userWithoutPassword,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'medical_imaging_secret_key_2024', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Protected route example
router.get('/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Export the authenticateToken middleware for use in other routes
module.exports = router;
module.exports.authenticateToken = authenticateToken;