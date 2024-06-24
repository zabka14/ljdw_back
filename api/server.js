const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Modifiez cette ligne
const passport = require('./auth');
const Post = require('../models/Post');
const User = require('../models/User'); // Assurez-vous d'avoir un modèle User

// Initialisez une application Express
const app = express();

// Middleware pour parser le JSON
app.use(express.json());

// Middleware pour parser les données URL-encoded
app.use(express.urlencoded({ extended: true }));

// Configuration de la session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }), // Modifiez cette ligne
  cookie: { secure: false } // Utilisez true si vous utilisez HTTPS
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuration de multer pour gérer les fichiers uploadés
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

// Connexion à MongoDB
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

// Routes d'authentification
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

// Gestion de la requête POST pour créer un nouveau post
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

    const newPost = new Post({ text, fileUrl });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gestion de la requête GET pour récupérer les posts avec pagination
app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const totalPosts = await Post.countDocuments();
    const posts = await Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.status(200).json({
      posts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gestion de la requête PUT pour liker un post
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

// Gestion de la requête PUT pour disliker un post
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

// Nouvelle route pour vérifier le statut de like d'un post
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

// Exportez l'application Express en tant que fonction serverless
module.exports = app;
