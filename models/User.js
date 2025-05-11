const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ... existing fields ...
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

// ... existing code ...

module.exports = mongoose.model('User', userSchema); 