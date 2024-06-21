const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Post = require('../models/Post');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const { text } = req.body;
        const imageUrl = `data:image/png;base64,${req.file.buffer.toString('base64')}`;
        const newPost = new Post({ text, imageUrl });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
