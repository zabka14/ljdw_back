const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const postsRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://vianeybenjamin:4Y3.&hHcBv9gAPdyujxW@cluster0.lgupyts.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.use('/api/posts', postsRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
