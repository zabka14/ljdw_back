const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  text: { type: String, required: true },
  fileUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
