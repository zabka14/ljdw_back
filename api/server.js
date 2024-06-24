const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./auth');
const Post = require('../models/Post');
const User = require('../models/User');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBM are allowed.'));
    }
  }
});

const dbUri = process.env.MONGODB_URI;
console.log('Connecting to MongoDB with URI:', dbUri);

mongoose.connect(dbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/',
  successRedirect: '/'
}));

app.get('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/posts', upload.single('file'), async (req, res) => {
  try {
    const { text, url } = req.body;
    let fileUrl;

    if (req.file) {
      fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (url) {
      fileUrl = url;
    } else {
      return res.status(400).json({ error: 'File or URL is required.' });
    }

    const newPost = new Post({
      text,
      fileUrl,
      author: req.user._id // Enregistre l'ID de l'utilisateur
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const totalPosts = await Post.countDocuments();
    const posts = await Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'displayName');
    res.status(200).json({
      posts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/posts/like', async (req, res) => {
  try {
    const { id } = req.body;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.likedBy) {
      post.likedBy = [];
    }

    if (post.likedBy.includes(req.user.id)) {
      return res.status(400).json({ error: 'User already liked this post' });
    }

    post.likes += 1;
    post.likedBy.push(req.user.id);
    await post.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/posts/dislike', async (req, res) => {
  try {
    const { id } = req.body;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.likedBy) {
      post.likedBy = [];
    }

    const index = post.likedBy.indexOf(req.user.id);
    if (index === -1) {
      return res.status(400).json({ error: 'User has not liked this post' });
    }

    post.likes -= 1;
    post.likedBy.splice(index, 1);
    await post.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to delete this post' });
    }

    await post.remove();
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts/:id/liked-status', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const liked = post.likedBy.includes(req.user.id);
    res.status(200).json({ liked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
