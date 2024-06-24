const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  displayName: { type: String, required: true },
  emails: [{
    value: String,
    verified: Boolean
  }]
});

module.exports = mongoose.model('User', userSchema);
