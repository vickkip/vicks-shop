const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Connect to MongoDB using the Environment Variable we set in Render
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// 2. Define a simple Product Schema (Example)
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String,
    price: Number,
    description: String
}));

// 3. API Routes
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// 4. SERVE FRONTEND FILES (The fix for "Not Found")
// This tells Express to look for index.html in your folder
app.use(express.static(path.join(__dirname)));

// This ensures that any link you visit loads your index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));