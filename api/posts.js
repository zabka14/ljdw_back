const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Post = require('../models/Post');
const cors = require('cors');

// Initialisez une application Express
const app = express();

// Utilisez le middleware CORS pour autoriser les requêtes cross-origin
app.use(cors({
  origin: 'https://ljdw-front.vercel.app' // Remplacez par l'URL de votre frontend déployé
}));

// Middleware pour parsing JSON
app.use(express.json());

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

// Route de test pour vérifier le CORS
app.get('/api/test', (req, res) => {
  res.json({ message: 'CORS works!' });
});

// Gestion de la requête POST pour créer un nouveau post
app.post('/api/posts.js', upload.single('file'), async (req, res) => {
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
app.get('/api/posts.js', async (req, res) => {
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

// Exportez l'application Express en tant que fonction serverless
module.exports = app;
