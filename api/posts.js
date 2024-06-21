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
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Gestion de la requête POST pour créer un nouveau post
app.post('/api/posts', upload.single('file'), async (req, res) => {
  try {
    const { text } = req.body;
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const newPost = new Post({ text, fileUrl });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gestion de la requête GET pour récupérer les posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportez l'application Express en tant que fonction serverless
module.exports = app;
