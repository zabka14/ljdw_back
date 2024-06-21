const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Post = require('../models/Post');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const User = require('../models/User');

// Initialisez une application Express
const app = express();

// Utilisez le middleware CORS pour autoriser les requêtes cross-origin
app.use(cors({
  origin: 'https://ljdw-front.vercel.app', // Remplacez par l'URL de votre frontend déployé
  credentials: true // Permettre les cookies d'authentification
}));

// Middleware pour parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurez la session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // Assurez-vous que ce paramètre est défini si vous utilisez HTTPS
    httpOnly: true, // Assurez-vous que ce paramètre est défini pour la sécurité
    sameSite: 'none' // Assurez-vous que ce paramètre est défini pour les requêtes cross-origin
  }
}));

// Initialisez Passport.js
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
}, async (token, tokenSecret, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = new User({
        googleId: profile.id,
        displayName: profile.displayName,
        emails: profile.emails.map(email => email.value)
      });
      await user.save();
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// Routes d'authentification
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('https://ljdw-front.vercel.app/'); // Redirection après authentification réussie
  }
);

app.get('/api/auth/logout', (req, res) => {
  req.logout();
  res.redirect('https://ljdw-front.vercel.app/');
});

// Route de test
app.get('/api/auth/test', (req, res) => {
  res.status(200).send('Test route works!');
});

app.get('/api/auth', (req, res) => {
  res.status(200).send('Auth route works!');
});

// Middleware pour vérifier si l'utilisateur est authentifié
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'User not authenticated' });
}

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
app.put('/api/posts/like', ensureAuthenticated, async (req, res) => {
  try {
    const { id, likes } = req.body;
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

// Exportez l'application Express en tant que fonction serverless
module.exports = app;
