const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  emails: [{ type: String }]
});

module.exports = mongoose.model('User', userSchema);
