const mongoose = require('mongoose');
const multer = require('multer');
const Post = require('../models/Post');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            const { text } = req.body;
            const imageUrl = `data:image/png;base64,${req.file.buffer.toString('base64')}`;
            const newPost = new Post({ text, imageUrl });
            await newPost.save();
            res.status(201).json(newPost);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'GET') {
        try {
            const posts = await Post.find().sort({ createdAt: -1 });
            res.status(200).json(posts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
