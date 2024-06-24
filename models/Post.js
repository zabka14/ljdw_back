const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  text: String,
  fileUrl: String,
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Nouveau champ
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);
